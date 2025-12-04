import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';
import { BaseVcAdapter } from './base-vc.adapter';
import { VcCreationResponse, CallbackResult } from './vc-adapter.interface';

@Injectable()
export class DhiwayVcAdapter extends BaseVcAdapter {
	private readonly baseUrl: string;
	private readonly organizationId: string;
	private readonly authToken: string;
	private readonly userId: string;

	constructor(private readonly configService: ConfigService) {
		super();
		this.baseUrl = this.configService.get<string>('VITE_VC_BASE_URL');
		this.organizationId = this.configService.get<string>(
			'VITE_VC_ORGANIZATION_ID',
		);
		this.authToken = this.configService.get<string>('VITE_VC_AUTH_TOKEN');
		this.userId = this.configService.get<string>('VITE_VC_USER_ID');
	}

	/**
	 * Get the issuer name for this adapter
	 */
	getIssuerName(): string {
		return 'dhiway';
	}

	/**
	 * Process a VC callback for any status (issued, revoked, deleted)
	 * @param publicId - The public ID (UUID) from the callback
	 * @param status - The status from callback (issued, revoked, deleted)
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 * @returns CallbackResult with status and VC data (if issued)
	 */
	async processCallback(
		publicId: string,
		status: 'issued' | 'revoked' | 'deleted',
		docDataLink?: string,
	): Promise<CallbackResult> {
		try {
			this.logger.log(`Processing ${status} callback for Dhiway public ID: ${publicId}`);

			if (status === 'issued') {
				// Fetch VC data from Dhiway .vc URL
				const vcData = await this.fetchVcDataAfterPublish(publicId, docDataLink);
				
				this.logSuccess('Issue callback processing', { publicId });
				
				return {
					success: true,
					status: 'issued',
					vcData: vcData,
					message: 'VC issued successfully',
				};
			} else {
				// For revoked, deleted - no need to fetch VC data
				this.logSuccess(`${status} callback processing`, { publicId });
				
				return {
					success: true,
					status: status,
					message: `VC ${status} successfully`,
				};
			}
		} catch (error) {
			this.logger.error(`Callback processing failed for public ID ${publicId}:`, error);
			return {
				success: false,
				status: status,
				message: error.message || `Failed to process ${status} callback`,
				error: error,
			};
		}
	}

	/**
	 * Process a publish callback for a VC record (deprecated - use processCallback with status='issued' instead)
	 * @param publicId - The public ID (UUID) from the callback
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 * @returns CallbackResult with VC data fetched from Dhiway
	 */
	async processPublishCallback(publicId: string, docDataLink?: string): Promise<CallbackResult> {
		return this.processCallback(publicId, 'issued', docDataLink);
	}

	/**
	 * Fetch VC data after publish from Dhiway .vc URL
	 * @param publicId - The public ID (UUID) to fetch VC data for
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 * @returns VC data from Dhiway platform
	 */
	async fetchVcDataAfterPublish(publicId: string, docDataLink?: string): Promise<any> {
		try {
			this.logger.log(`Fetching published VC data for public ID: ${publicId}`);
			
			// Use doc_data_link if provided (already includes .vc), otherwise construct URL
			const vcUrl = docDataLink;
			this.logger.debug(`Fetching VC from URL: ${vcUrl}`);

			// Fetch VC data from Dhiway platform
			const response = await axios.get(vcUrl, {
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				timeout: 10000, // 10 second timeout
			});

			// Validate response
			if (!response.data) {
				throw new Error('Empty response from VC URL');
			}

			// Validate VC structure
			if (!this.validateVcData(response.data)) {
				throw new Error('Invalid VC data structure received from Dhiway');
			}

			this.logger.log(`Successfully fetched VC data for public ID: ${publicId}`);
			this.logger.debug(`VC data keys: ${Object.keys(response.data).join(', ')}`);

			return response.data;
		} catch (error) {
			this.logger.error(`Failed to fetch VC data for public ID ${publicId}:`, error);
			
			if (axios.isAxiosError(error)) {
				const status = error.response?.status;
				const message = error.response?.data?.message || error.message;
				
				if (status === 404) {
					throw new Error(`VC not found for public ID: ${publicId}. The VC may not be published yet.`);
				}
				
				throw new Error(`Failed to fetch VC from Dhiway: ${message} (Status: ${status || 'Unknown'})`);
			}
			
			throw new Error(`Failed to fetch VC data: ${error.message}`);
		}
	}

	/**
	 * Verify a VC record
	 * @param vcData - The VC data to verify
	 * @returns Verification result
	 */
	async verifyRecord(vcData: any): Promise<{ success: boolean; message?: string; errors?: any[] }> {
		try {
			this.logger.log('Verifying Dhiway VC record');
			
			if (!this.validateVcData(vcData)) {
				return {
					success: false,
					message: 'Invalid VC data structure',
					errors: ['VC data does not contain required fields']
				};
			}

			// For mock implementation, always return success for valid structure
			this.logSuccess('VC verification');
			
			return {
				success: true,
				message: 'VC verification successful'
			};
		} catch (error) {
			this.logger.error('VC verification failed:', error);
			return {
				success: false,
				message: 'VC verification failed',
				errors: [error.message]
			};
		}
	}

	/**
	 * Create a VC record using Dhiway API
	 * @param spaceId - Space ID from vcConfiguration
	 * @param mappedData - OCR extracted and mapped data
	 * @param originalFile - Original document file (optional, for attachment)
	 * @param userId - User ID from authentication token (optional)
	 * @param vcFields - VcFields configuration to determine field roles (optional)
	 * @returns VcCreationResponse with verificationUrl
	 */
	async createRecord(
		spaceId: string,
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
		userId?: string,
		vcFields?: Record<string, any>,
	): Promise<VcCreationResponse> {
		try {
			const validationError = this.validateDhiwayConfiguration(spaceId);
			if (validationError) {
				return validationError;
			}

			const url = `${this.baseUrl}/${this.organizationId}/${spaceId}/records`;
			const formData = this.prepareFormData(mappedData, originalFile, userId, vcFields);

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
			return this.handleDhiwayError(error);
		}
	}

	private validateDhiwayConfiguration(spaceId: string): VcCreationResponse | null {
		// Use base class validation for spaceId
		const baseValidation = super.validateConfiguration(spaceId);
		if (baseValidation) {
			return baseValidation;
		}

		// Dhiway-specific configuration validation
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

		return null;
	}

	private prepareFormData(
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
		userId?: string,
		vcFields?: Record<string, any>,
	): FormData {
		this.logger.debug(
			`Mapped data received (${Object.keys(mappedData).length} fields): ${JSON.stringify(mappedData, null, 2)}`,
		);

		const formData = new FormData();
		const { originalDocFieldName, beneficiaryUserIdFieldName } = this.extractFieldNames(vcFields);

		this.appendMappedData(formData, mappedData);
		
		// Only attach original file if original_document field exists in vcFields with proper configuration
		if (originalDocFieldName && this.hasValidOriginalDocumentConfig(vcFields, originalDocFieldName)) {
			this.attachOriginalFile(formData, originalFile, originalDocFieldName);
		} else if (originalFile) {
			this.logger.debug(`Original file not attached - original_document field not present or not properly configured in vcFields`);
		}
		
		// Only attach userId if beneficiary_user_id field exists in vcFields with proper configuration
		if (beneficiaryUserIdFieldName && this.hasValidBeneficiaryUserIdConfig(vcFields, beneficiaryUserIdFieldName)) {
			this.attachUserId(formData, userId, beneficiaryUserIdFieldName);
		} else if (userId) {
			this.logger.debug(`User ID not attached - beneficiary_user_id field not present or not properly configured in vcFields`);
		}

		return formData;
	}

	private extractFieldNames(vcFields?: Record<string, any>): {
		originalDocFieldName: string | null;
		beneficiaryUserIdFieldName: string | null;
	} {
		let originalDocFieldName: string | null = null;
		let beneficiaryUserIdFieldName: string | null = null;

		this.logger.debug(`vcFields provided: ${!!vcFields}, vcFields keys: ${vcFields ? Object.keys(vcFields).join(', ') : 'N/A'}`);

		if (vcFields) {
			for (const [fieldName, fieldConfig] of Object.entries(vcFields)) {
				this.logger.debug(`Checking field '${fieldName}' with role: ${fieldConfig.role || 'N/A'}`);
				if (fieldConfig.role === 'original_document') {
					originalDocFieldName = fieldName;
					this.logger.log(`Found original document field name: '${originalDocFieldName}'`);
				} else if (fieldConfig.role === 'beneficiary_user_id') {
					beneficiaryUserIdFieldName = fieldName;
					this.logger.log(`Found beneficiary user ID field name: '${beneficiaryUserIdFieldName}'`);
				}
			}
		}

		this.logger.debug(`Resolved field names - originalDoc: '${originalDocFieldName}', userId: '${beneficiaryUserIdFieldName}'`);
		return { originalDocFieldName, beneficiaryUserIdFieldName };
	}

	private appendMappedData(formData: FormData, mappedData: Record<string, any>): void {
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
	}

	private attachOriginalFile(
		formData: FormData,
		originalFile?: Express.Multer.File,
		originalDocFieldName?: string | null,
	): void {
		if (originalFile && originalDocFieldName) {
			formData.append(originalDocFieldName, originalFile.buffer, {
				filename: originalFile.originalname,
				contentType: originalFile.mimetype,
			});
			this.logger.log(
				`✓ Original file attached to '${originalDocFieldName}' field: ${originalFile.originalname} (${originalFile.mimetype}, ${originalFile.size} bytes)`,
			);
		}
	}

	/**
	 * Check if vcFields contains valid original_document configuration
	 * @param vcFields - VcFields configuration
	 * @param originalDocFieldName - Field name with original_document role
	 * @returns True if field has type="file", required=true, and role="original_document"
	 */
	private hasValidOriginalDocumentConfig(
		vcFields?: Record<string, any>,
		originalDocFieldName?: string | null,
	): boolean {
		if (!vcFields || !originalDocFieldName) {
			return false;
		}

		const fieldConfig = vcFields[originalDocFieldName];
		
		if (!fieldConfig) {
			this.logger.debug(`Field '${originalDocFieldName}' not found in vcFields`);
			return false;
		}

		const hasValidType = fieldConfig.type === 'file';
		const hasValidRequired = fieldConfig.required === true;
		const hasValidRole = fieldConfig.role === 'original_document';

		this.logger.debug(
			`Validating original_document field '${originalDocFieldName}': type='${fieldConfig.type}' (valid: ${hasValidType}), required=${fieldConfig.required} (valid: ${hasValidRequired}), role='${fieldConfig.role}' (valid: ${hasValidRole})`,
		);

		return hasValidType && hasValidRequired && hasValidRole;
	}

	/**
	 * Check if vcFields contains valid beneficiary_user_id configuration
	 * @param vcFields - VcFields configuration
	 * @param beneficiaryUserIdFieldName - Field name with beneficiary_user_id role
	 * @returns True if field has type="string", required=true, and role="beneficiary_user_id"
	 */
	private hasValidBeneficiaryUserIdConfig(
		vcFields?: Record<string, any>,
		beneficiaryUserIdFieldName?: string | null,
	): boolean {
		if (!vcFields || !beneficiaryUserIdFieldName) {
			return false;
		}

		const fieldConfig = vcFields[beneficiaryUserIdFieldName];
		
		if (!fieldConfig) {
			this.logger.debug(`Field '${beneficiaryUserIdFieldName}' not found in vcFields`);
			return false;
		}

		const hasValidType = fieldConfig.type === 'string';
		const hasValidRequired = fieldConfig.required === true;
		const hasValidRole = fieldConfig.role === 'beneficiary_user_id';

		this.logger.debug(
			`Validating beneficiary_user_id field '${beneficiaryUserIdFieldName}': type='${fieldConfig.type}' (valid: ${hasValidType}), required=${fieldConfig.required} (valid: ${hasValidRequired}), role='${fieldConfig.role}' (valid: ${hasValidRole})`,
		);

		return hasValidType && hasValidRequired && hasValidRole;
	}

	private attachUserId(
		formData: FormData,
		userId?: string,
		beneficiaryUserIdFieldName?: string,
	): void {
		if (userId && beneficiaryUserIdFieldName) {
			formData.append(beneficiaryUserIdFieldName, userId);
			this.logger.log(`✓ Beneficiary user ID attached to '${beneficiaryUserIdFieldName}' field: ${userId}`);
		}
	}

	private processResponse(data: any): VcCreationResponse {
		let verificationUrl = data?.verificationUrl || data?.verification_url;
		const recordId = data?.recordId || data?.record_id || data?.id;

		if (!verificationUrl) {
			this.logger.warn('No verificationUrl in Dhiway API response');
			return {
				success: false,
				message: 'No verificationUrl returned from Dhiway API',
				error: data,
			};
		}

		// Ensure verificationUrl ends with .vc
		if (!verificationUrl.endsWith('.vc')) {
			verificationUrl = `${verificationUrl}.vc`;
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

	private handleDhiwayError(error: any): VcCreationResponse {
		// Use base class error handling
		return super.handleError(error, 'VC creation') as VcCreationResponse;
	}

	/**
	 * Extract public ID from Dhiway verification URL
	 * Dhiway URLs are in format: https://dway.io/depwd/{publicId}.vc
	 * @param verificationUrl - The verification URL from Dhiway
	 * @returns The public ID (UUID) or null if not found
	 */
	extractPublicId(verificationUrl?: string): string | null {
		if (!verificationUrl) {
			return null;
		}

		try {
			// Extract UUID from URL pattern: https://dway.io/depwd/{uuid}.vc
			const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
			const match = uuidRegex.exec(verificationUrl);
			if (match?.[1]) {
				return match[1];
			}
			
			// Alternative: Extract from path segments
			const urlParts = verificationUrl.split('/');
			const lastPart = urlParts.at(-1);
			if (lastPart) {
				// Remove .vc extension if present
				const cleanId = lastPart.replace(/\.vc$/, '');
				// Validate it looks like a UUID
				if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
					return cleanId;
				}
			}
			
			return null;
		} catch (error) {
			this.logger.warn(`Failed to extract public ID from URL: ${verificationUrl}`, error);
			return null;
		}
	}

}

