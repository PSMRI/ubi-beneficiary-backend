import { Injectable, Logger } from '@nestjs/common';
import { DhiwayVcAdapter } from './dhiway-vc.adapter';
import { VcCreationResponse, VcAdapterInterface, CallbackResult } from './vc-adapter.interface';

/**
 * Factory service for managing VC adapter implementations
 */
@Injectable()
export class VcAdapterFactory {
	private readonly logger = new Logger(VcAdapterFactory.name);

	constructor(private readonly dhiwayVcAdapter: DhiwayVcAdapter) {}

	/**
	 * Get the appropriate VC adapter based on issuer type
	 * @param issuer - Issuer type (e.g., 'dhiway', 'sunbird', 'sunbirdrc')
	 * @returns VC adapter implementation
	 */
	getAdapter(issuer: string): VcAdapterInterface | null {
		const normalizedIssuer = issuer?.toLowerCase().trim();

		switch (normalizedIssuer) {
			case 'dhiway':
				this.logger.log('Using Dhiway VC adapter');
				return this.dhiwayVcAdapter;

			case 'sunbird':
			case 'sunbirdrc':
				this.logger.warn('SunbirdRC adapter not yet implemented');
				return null;

			default:
				this.logger.warn(`Unknown issuer type: ${issuer}`);
				return null;
		}
	}

	/**
	 * Create a VC record using the appropriate adapter
	 * @param issuer - Issuer type
	 * @param spaceId - Space ID from vcConfiguration
	 * @param mappedData - OCR extracted and mapped data
	 * @param originalFile - Original document file (optional)
	 * @param userId - User ID from authentication token (optional)
	 * @param vcFields - VcFields configuration to determine field roles (optional)
	 */
	async createRecord(
		issuer: string,
		spaceId: string,
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
		userId?: string,
		vcFields?: Record<string, any>,
	): Promise<VcCreationResponse> {
		const adapter = this.getAdapter(issuer);

		if (!adapter) {
			return {
				success: false,
				message: `No VC adapter available for issuer: ${issuer}`,
			};
		}

		return adapter.createRecord(spaceId, mappedData, originalFile, userId, vcFields);
	}

	/**
	 * Process a VC callback using the appropriate adapter
	 * @param issuer - Issuer type
	 * @param publicId - Public ID (UUID) from callback
	 * @param status - The status from callback
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 */
	async processCallback(
		issuer: string,
		publicId: string,
		status: 'published' | 'rejected' | 'deleted' | 'revoked',
		docDataLink?: string,
	): Promise<CallbackResult> {
		const adapter = this.getAdapter(issuer);

		if (!adapter) {
			return {
				success: false,
				status: status,
				message: `No VC adapter available for issuer: ${issuer}`,
			};
		}

		return adapter.processCallback(publicId, status, docDataLink);
	}

	/**
	 * Process a publish callback using the appropriate adapter (deprecated - use processCallback instead)
	 * @param issuer - Issuer type
	 * @param publicId - Public ID (UUID) from callback
	 * @param docDataLink - Optional: The full VC URL from doc_data_link (already includes .vc)
	 */
	async processPublishCallback(
		issuer: string,
		publicId: string,
		docDataLink?: string,
	): Promise<CallbackResult> {
		return this.processCallback(issuer, publicId, 'published', docDataLink);
	}
}
