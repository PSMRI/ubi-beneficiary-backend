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
		this.organizationId = this.configService.get<string>(
			'VITE_VC_ORGANIZATION_ID',
		);
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
			const validationError = this.validateConfiguration(spaceId);
			if (validationError) {
				return validationError;
			}

			const url = `${this.baseUrl}/${this.organizationId}/${spaceId}/records`;
			const formData = this.prepareFormData(mappedData, originalFile, userId);

			this.logger.log(`Creating VC record in Dhiway - URL: ${url}`);
			const response = await axios.post(url, formData, {
				headers: {
					Authorization: `Bearer ${this.authToken}`,
					'X-UserId': this.userId,
					Accept: 'application/json',
					...formData.getHeaders(),
				},
				timeout: 30000,
			});

			this.logger.debug(`Dhiway API response status: ${response.status}`);
			this.logger.debug(
				`Dhiway API response data: ${JSON.stringify(response.data, null, 2)}`,
			);

			return this.processResponse(response.data);
		} catch (error) {
			return this.handleError(error);
		}
	}

	private validateConfiguration(spaceId: string): VcCreationResponse | null {
		if (
			!this.baseUrl ||
			!this.organizationId ||
			!this.authToken ||
			!this.userId
		) {
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

		return null;
	}

	private prepareFormData(
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
		userId?: string,
	): FormData {
		this.logger.debug(
			`Mapped data received (${Object.keys(mappedData).length} fields): ${JSON.stringify(mappedData, null, 2)}`,
		);

		const formData = new FormData();
		const addedFields = [];

		for (const [key, value] of Object.entries(mappedData)) {
			if (value !== null && value !== undefined) {
				formData.append(key, String(value));
				addedFields.push(`${key}: ${String(value)}`);
			}
		}

		this.logger.debug(
			`Form data fields added (${addedFields.length}): ${addedFields.join(', ')}`,
		);

		if (originalFile) {
			formData.append('originalvc', originalFile.buffer, {
				filename: originalFile.originalname,
				contentType: originalFile.mimetype,
			});
			this.logger.debug(
				`Original file attached to 'originalvc' field: ${originalFile.originalname} (${originalFile.mimetype}, ${originalFile.size} bytes)`,
			);
		}

		if (userId) {
			formData.append('beneficiary_userid', userId);
			this.logger.debug(`Beneficiary user ID attached: ${userId}`);
		} else {
			this.logger.warn(
				'No userId provided, beneficiary_userid field will not be set',
			);
		}

		return formData;
	}

	private processResponse(data: any): VcCreationResponse {
		const verificationUrl = data?.verificationUrl || data?.verification_url;
		const recordId = data?.recordId || data?.record_id || data?.id;

		if (!verificationUrl) {
			this.logger.warn('No verificationUrl in Dhiway API response');
			return {
				success: false,
				message: 'No verificationUrl returned from Dhiway API',
				error: data,
			};
		}

		this.logger.log(
			`VC record created successfully - Record ID: ${recordId}, Verification URL: ${verificationUrl}`,
		);

		return {
			success: true,
			verificationUrl,
			recordId,
			message: 'VC created successfully',
		};
	}

	private handleError(error: any): VcCreationResponse {
		this.logger.error(
			'Error creating Dhiway VC record:',
			error?.response?.data || error.message,
		);
		this.logger.error(
			`Full error details - Status: ${error?.response?.status}, StatusText: ${error?.response?.statusText}`,
		);
		this.logger.error(`Request URL: ${error?.config?.url}`);
		this.logger.error(
			`Error response: ${JSON.stringify(error?.response?.data, null, 2)}`,
		);

		const errorMessage = this.extractErrorMessage(error);

		return {
			success: false,
			message: errorMessage,
			error: error?.response?.data || error.message,
		};
	}

	private extractErrorMessage(error: any): string {
		if (error?.response?.data) {
			const errorData = error.response.data;
			return (
				errorData.error ||
				errorData.message ||
				errorData.details ||
				(typeof errorData === 'string'
					? errorData
					: 'Failed to create VC record')
			);
		}
		return error.message || 'Failed to create VC record';
	}
}
