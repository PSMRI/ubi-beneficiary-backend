import { Injectable } from '@nestjs/common';

export interface VcCreationResponse {
	success: boolean;
	verificationUrl?: string;
	recordId?: string;
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
	 */
	abstract createRecord(
		spaceId: string,
		mappedData: Record<string, any>,
		originalFile?: Express.Multer.File,
	): Promise<VcCreationResponse>;
}
