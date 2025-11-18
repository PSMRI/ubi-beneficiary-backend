import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

export interface VcCreationResponse {
	success: boolean;
	verificationUrl?: string;
	recordId?: string;
	message?: string;
	error?: any;
}

@Injectable()
export class DhiwayVcAdapter {
	private readonly logger = new Logger(DhiwayVcAdapter.name);
	private readonly baseUrl: string;
	private readonly organizationId: string;
	private readonly authToken: string;
	private readonly userId: string;

	constructor(private readonly configService: ConfigService) {
		this.baseUrl = this.configService.get<string>('VITE_VC_BASE_URL');
		this.organizationId = this.configService.get<string>('VITE_VC_ORGANIZATION_ID');
		this.authToken = this.configService.get<string>('VITE_VC_AUTH_TOKEN');
		this.userId = this.configService.get<string>('VITE_VC_USER_ID');
	}

	/**
	 * Create a VC record using Dhiway API
	 * @param spaceId - Space ID from vcConfiguration
	 * @param mappedData - OCR extracted and mapped data
	 * @param originalFile - Original document file (optional, for attachment)
	 * @param userId - User ID from authentication token (optional)
	 * @returns VcCreationResponse with verificationUrl
	 */
	async createRecord(
		spaceId: string,
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
		userId?: string,
	): Promise<VcCreationResponse> {
		try {
			// Validate required configuration
			if (!this.baseUrl || !this.organizationId || !this.authToken || !this.userId) {
				this.logger.error('Missing Dhiway VC configuration');
				return {
					success: false,
					message: 'Missing Dhiway VC configuration in environment variables',
				};
			}

			if (!spaceId) {
				this.logger.error('Space ID not provided');
				return {
					success: false,
					message: 'Space ID is required for VC creation',
				};
			}

		// Construct the API URL
		const url = `${this.baseUrl}/${this.organizationId}/${spaceId}/records`;

		// Log mapped data for debugging
		this.logger.debug(`Mapped data received (${Object.keys(mappedData).length} fields): ${JSON.stringify(mappedData, null, 2)}`);

		// Prepare form data
		const formData = new FormData();

		// Add all mapped data fields to form data
		const addedFields = [];
		for (const [key, value] of Object.entries(mappedData)) {
			if (value !== null && value !== undefined) {
				formData.append(key, String(value));
				addedFields.push(`${key}: ${String(value)}`);
			}
		}

		this.logger.debug(`Form data fields added (${addedFields.length}): ${addedFields.join(', ')}`);

		// TODO: Make this dynamic - identify file fields from vcFields schema (type: "file")
		// Currently hardcoded to always attach uploaded file to 'originalvc' field
		// Future: Check vcFields for fields with type="file" and attach file to those fields
		if (originalFile) {
			formData.append('originalvc', originalFile.buffer, {
				filename: originalFile.originalname,
				contentType: originalFile.mimetype,
			});
			this.logger.debug(`Original file attached to 'originalvc' field: ${originalFile.originalname} (${originalFile.mimetype}, ${originalFile.size} bytes)`);
		}

		// TODO: Make this dynamic - identify user ID fields from vcFields schema
		// Currently hardcoded to use 'beneficiary_userid' field
		// Future: 
		// 1. Check vcFields schema for fields that require user/beneficiary ID
		// 2. Dynamically identify and populate those fields
		if (userId) {
			formData.append('beneficiary_userid', userId);
			this.logger.debug(`Beneficiary user ID attached: ${userId}`);
		} else {
			this.logger.warn('No userId provided, beneficiary_userid field will not be set');
		}

		this.logger.log(`Creating VC record in Dhiway - URL: ${url}`);			// Make API request
			const response = await axios.post(url, formData, {
				headers: {
					'Authorization': `Bearer ${this.authToken}`,
					'X-UserId': this.userId,
					'Accept': 'application/json',
					...formData.getHeaders(),
				},
				timeout: 30000,
			});

			this.logger.debug(`Dhiway API response status: ${response.status}`);
			this.logger.debug(`Dhiway API response data: ${JSON.stringify(response.data, null, 2)}`);

			// Extract verification URL from response
			const verificationUrl = response.data?.verificationUrl || response.data?.verification_url;
			const recordId = response.data?.recordId || response.data?.record_id || response.data?.id;

			if (!verificationUrl) {
				this.logger.warn('No verificationUrl in Dhiway API response');
				return {
					success: false,
					message: 'No verificationUrl returned from Dhiway API',
					error: response.data,
				};
			}

			this.logger.log(`VC record created successfully - Record ID: ${recordId}, Verification URL: ${verificationUrl}`);

			return {
				success: true,
				verificationUrl,
				recordId,
				message: 'VC created successfully',
			};
		} catch (error) {
			this.logger.error('Error creating Dhiway VC record:', error?.response?.data || error.message);
			this.logger.error(`Full error details - Status: ${error?.response?.status}, StatusText: ${error?.response?.statusText}`);
			this.logger.error(`Request URL: ${error?.config?.url}`);
			this.logger.error(`Error response: ${JSON.stringify(error?.response?.data, null, 2)}`);
			
			// Extract error message from various possible response formats
			let errorMessage = 'Failed to create VC record';
			
			if (error?.response?.data) {
				const errorData = error.response.data;
				// Check multiple possible error message fields
				errorMessage = errorData.error || 
							  errorData.message || 
							  errorData.details || 
							  (typeof errorData === 'string' ? errorData : errorMessage);
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			return {
				success: false,
				message: errorMessage,
				error: error?.response?.data || error.message,
			};
		}
	}
}
