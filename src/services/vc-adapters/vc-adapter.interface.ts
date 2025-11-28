import { Injectable } from '@nestjs/common';

export interface VcCreationResponse {
	success: boolean;
	verificationUrl?: string;
	recordId?: string;
	message?: string;
	error?: any;
}

export interface CallbackResult {
	success: boolean;
	status: 'published' | 'rejected' | 'deleted' | 'revoked';
	vcData?: any;
	message?: string;
	error?: any;
}

/**
 * Base interface for VC adapter implementations
 */
@Injectable()
export abstract class VcAdapterInterface {
	/**
	 * Create a VC record
	 * @param spaceId - Space ID from vcConfiguration
	 * @param mappedData - OCR extracted and mapped data
	 * @param originalFile - Original document file (optional)
	 * @param userId - User ID from authentication token (optional)
	 * @param vcFields - VcFields configuration to determine field roles (optional)
	 */
	abstract createRecord(
		spaceId: string,
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
		userId?: string,
		vcFields?: Record<string, any>,
	): Promise<VcCreationResponse>;

	/**
	 * Process a VC callback for any status (published, rejected, deleted, revoked)
	 * @param publicId - The public ID (UUID) from the callback
	 * @param status - The status from callback
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 * @returns CallbackResult with status and VC data (if published)
	 */
	abstract processCallback(publicId: string, status: 'published' | 'rejected' | 'deleted' | 'revoked', docDataLink?: string): Promise<CallbackResult>;

	/**
	 * Process a publish callback for a VC record (deprecated - use processCallback instead)
	 * @param publicId - The public ID (UUID) from the callback
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 * @returns CallbackResult with VC data if successful
	 */
	abstract processPublishCallback(publicId: string, docDataLink?: string): Promise<CallbackResult>;

	/**
	 * Fetch VC data after publish from issuer platform
	 * @param publicId - The public ID (UUID) to fetch VC data for
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 * @returns The VC data from issuer platform
	 */
	abstract fetchVcDataAfterPublish(publicId: string, docDataLink?: string): Promise<any>;

	/**
	 * Verify a VC record
	 * @param vcData - The VC data to verify
	 * @returns Verification result
	 */
	abstract verifyRecord(vcData: any): Promise<{ success: boolean; message?: string; errors?: any[] }>;

	/**
	 * Extract or get public ID from verification URL or response
	 * Some issuers (like Dhiway) embed the publicId in the URL, others might provide it directly
	 * @param verificationUrl - The verification URL from the issuer
	 * @returns The public ID (UUID) or null if not found/not applicable
	 */
	abstract extractPublicId(verificationUrl?: string): string | null;
}
