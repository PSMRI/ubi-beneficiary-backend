import { Injectable, Logger } from '@nestjs/common';
import { VcAdapterInterface, VcCreationResponse, CallbackResult } from './vc-adapter.interface';

/**
 * Abstract base class for VC adapter implementations
 * Provides common functionality and logging
 */
@Injectable()
export abstract class BaseVcAdapter extends VcAdapterInterface {
	protected readonly logger = new Logger(this.constructor.name);

	/**
	 * Get the issuer name for this adapter
	 */
	abstract getIssuerName(): string;

	/**
	 * Validate configuration for VC operations
	 * @param spaceId - Space ID from configuration
	 * @returns Validation result or null if valid
	 */
	protected validateConfiguration(spaceId: string): VcCreationResponse | null {
		if (!spaceId || spaceId.trim() === '') {
			return {
				success: false,
				message: `Space ID is required for ${this.getIssuerName()} VC creation`,
			};
		}
		return null;
	}

	/**
	 * Handle errors in VC operations
	 * @param error - The error that occurred
	 * @param operation - The operation that failed
	 * @returns Error response
	 */
	protected handleError(error: any, operation: string): VcCreationResponse | CallbackResult {
		this.logger.error(`${operation} failed for ${this.getIssuerName()}:`, error);
		
		let message = `${operation} failed`;
		if (error?.response?.data?.message) {
			message = error.response.data.message;
		} else if (error?.message) {
			message = error.message;
		}

		return {
			success: false,
			message,
			error: error?.response?.data || error,
		};
	}

	/**
	 * Log successful operations
	 * @param operation - The operation that succeeded
	 * @param details - Additional details to log
	 */
	protected logSuccess(operation: string, details?: any): void {
		this.logger.log(`${operation} successful for ${this.getIssuerName()}`, details);
	}

	/**
	 * Validate VC data structure
	 * @param vcData - The VC data to validate
	 * @returns True if valid, false otherwise
	 */
	protected validateVcData(vcData: any): boolean {
		if (!vcData || typeof vcData !== 'object') {
			return false;
		}

		// Basic VC structure validation
		return (
			vcData.credentialSubject ||
			vcData.type ||
			vcData['@type'] ||
			vcData['@context']
		);
	}
}
