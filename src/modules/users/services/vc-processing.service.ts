import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDoc } from '@entities/user_docs.entity';
import { User } from '@entities/user.entity';
import { VcAdapterFactory } from '@services/vc-adapters/vc-adapter.factory';
import ProfilePopulator from 'src/common/helper/profileUpdate/profile-update';
import axios from 'axios';

export interface VcProcessingResult {
	success: boolean;
	error?: string;
	data?: {
		doc_id: string;
		user_id: string;
		public_id: string;
		status: 'issued' | 'revoked' | 'deleted';
		issuer: string;
		verified: boolean | null;
		verified_at: Date | null;
	};
}

@Injectable()
export class VcProcessingService {
	private readonly logger = new Logger(VcProcessingService.name);

	constructor(
		@InjectRepository(UserDoc)
		private readonly userDocsRepository: Repository<UserDoc>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly vcAdapterFactory: VcAdapterFactory,
		private readonly profilePopulator: ProfilePopulator,
	) {}

	/**
	 * Process VC event internally (extracted from UserService.processVcEvent)
	 * Returns simple result object instead of HTTP response
	 * @param publicId - The public ID (UUID) from the event payload
	 * @param status - The status from event (issued, revoked, deleted)
	 * @param timestamp - Optional timestamp from event
	 * @returns VcProcessingResult with success status and data
	 */
	async processVcEventInternal(
		publicId: string,
		status: 'issued' | 'revoked' | 'deleted',
		timestamp?: string,
	): Promise<VcProcessingResult> {
		try {
			this.logger.log(
				`Processing VC event for public ID: ${publicId}, status: ${status}`,
			);

			// Find document by vc_public_id only
			const userDoc = await this.userDocsRepository.findOne({
				where: {
					vc_public_id: publicId,
				},
			});

			if (!userDoc) {
				this.logger.warn(`No VC found for public ID: ${publicId}`);
				return {
					success: false,
					error: `No VC found for public ID: ${publicId}`,
				};
			}

			this.logger.log(
				`Found document ${userDoc.doc_id} for public ID ${publicId}`,
			);

			// Get issuer from document record (automatically determined)
			const documentIssuer = userDoc.issuer;
			if (!documentIssuer) {
				this.logger.error(`No issuer found in document ${userDoc.doc_id}`);
				return {
					success: false,
					error: `No issuer found for document ${userDoc.doc_id}`,
				};
			}

			// Process event using adapter (handles all status-specific logic)
			const callbackResult = await this.vcAdapterFactory.processCallback(
				documentIssuer,
				publicId,
				status,
				userDoc.doc_data_link,
			);

			if (!callbackResult.success) {
				this.logger.error(
					`Callback processing failed: ${callbackResult.message}`,
				);
				return {
					success: false,
					error:
						callbackResult.message || 'Callback processing failed',
				};
			}

			// Log adapter response for debugging
			this.logger.log(
				`Adapter callback result: success=${callbackResult.success}, status=${callbackResult.status}, inputStatus=${status}`,
			);

			// Update document first - fetch doc_data from doc_data_link for issued and revoked
			if (callbackResult.status === 'issued') {
				// Update doc_data from fetched VC data
				if (callbackResult.vcData) {
					userDoc.doc_data = JSON.stringify(callbackResult.vcData) as any;
				}
				userDoc.vc_status = 'issued';
				this.logger.log(`Setting vc_status to 'issued' for ${publicId}`);
			} else if (callbackResult.status === 'revoked') {
				// Update doc_data from fetched VC data (revoked VC still has data)
				if (callbackResult.vcData) {
					userDoc.doc_data = JSON.stringify(callbackResult.vcData) as any;
				}
				userDoc.vc_status = 'revoked';
				this.logger.log(`Setting vc_status to 'revoked' for ${publicId}`);
			} else if (callbackResult.status === 'deleted') {
				// Remove data for deleted VCs
				userDoc.doc_data = null;
				userDoc.doc_verified = null;
				userDoc.verified_at = null;
				userDoc.vc_status = 'deleted';
				this.logger.log(`Setting vc_status to 'deleted' for ${publicId}`);
			} else {
				this.logger.error(
					`Unexpected callback status: ${callbackResult.status} for ${publicId}. Expected: issued, revoked, or deleted`,
				);
				return {
					success: false,
					error: `Unexpected callback status: ${callbackResult.status}`,
				};
			}

			userDoc.vc_status_updated_at = new Date(
				timestamp || new Date().toISOString(),
			);

			// Log before save
			this.logger.log(
				`Before save - vc_status=${userDoc.vc_status}, vc_status_updated_at=${userDoc.vc_status_updated_at?.toISOString()}`,
			);

			// Save document first (before verification)
			const updatedDoc = await this.userDocsRepository.save(userDoc);

			// Reload document from database to verify status was persisted
			const reloadedDoc = await this.userDocsRepository.findOne({
				where: { doc_id: updatedDoc.doc_id },
			});

			// Verify status was saved correctly
			if (reloadedDoc && reloadedDoc.vc_status !== callbackResult.status) {
				this.logger.error(
					`Status mismatch after save! Expected: ${callbackResult.status}, Saved: ${updatedDoc.vc_status}, Reloaded: ${reloadedDoc.vc_status} for ${publicId}`,
				);
			}

			this.logger.log(
				`Document ${updatedDoc.doc_id} updated with status: ${callbackResult.status}. Saved vc_status=${updatedDoc.vc_status}, Reloaded vc_status=${reloadedDoc?.vc_status}, vc_status_updated_at=${updatedDoc.vc_status_updated_at?.toISOString()}`,
			);

			// Verify document after updating doc_data (for issued and revoked)
			// Verification will update doc_verified based on result
			if (callbackResult.status === 'issued' || callbackResult.status === 'revoked') {
				await this.verifyPublishedVc(updatedDoc, documentIssuer);
				// Reload document to get updated verification status
				const reloadedAfterVerification = await this.userDocsRepository.findOne({
					where: { doc_id: updatedDoc.doc_id },
				});
				if (reloadedAfterVerification) {
					updatedDoc.doc_verified = reloadedAfterVerification.doc_verified;
					updatedDoc.verified_at = reloadedAfterVerification.verified_at;
				}
			}

			// Update profile for all successful callbacks (common logic)
			// Profile needs to be updated regardless of status to reflect document changes
			await this.updateUserProfileAfterCallback(
				updatedDoc,
				callbackResult.status,
			);

			return {
				success: true,
				data: {
					doc_id: updatedDoc.doc_id,
					user_id: updatedDoc.user_id,
					public_id: publicId,
					status: callbackResult.status,
					issuer: documentIssuer,
					verified: updatedDoc.doc_verified,
					verified_at: updatedDoc.verified_at,
				},
			};
		} catch (error) {
			this.logger.error(
				`Error processing VC event: ${error.message}`,
				error.stack,
			);
			return {
				success: false,
				error: error.message || 'Failed to process VC event',
			};
		}
	}

	/**
	 * Verify VC data and update doc_verified based on verification result
	 * Does not fail the operation if verification fails - just updates doc_verified status
	 * @param updatedDoc - The updated document
	 * @param documentIssuer - The issuer of the document
	 */
	private async verifyPublishedVc(
		updatedDoc: UserDoc,
		documentIssuer: string,
	): Promise<void> {
		try {
			// Parse VC data from doc_data for verification
			let vcDataForVerification;
			try {
				vcDataForVerification =
					typeof updatedDoc.doc_data === 'string'
						? JSON.parse(updatedDoc.doc_data)
						: updatedDoc.doc_data;
			} catch (parseError) {
				this.logger.error(
					`Failed to parse VC data for verification: ${parseError.message}`,
				);
				// Set doc_verified to false if we can't parse the data
				updatedDoc.doc_verified = false;
				// Don't set verified_at to null - keep existing value
				await this.userDocsRepository.save(updatedDoc);
				return;
			}

			this.logger.log(
				`Verifying VC data after document update for ${updatedDoc.vc_status} status`,
			);
			const verificationResult = await this.verifyVcWithApi(
				vcDataForVerification,
				documentIssuer,
			);

			if (verificationResult.success) {
				this.logger.log(
					`VC verification successful - setting doc_verified = true`,
				);
				updatedDoc.doc_verified = true;
				updatedDoc.verified_at = new Date();
			} else {
				this.logger.error(
					`VC verification failed: ${verificationResult.message}. Setting doc_verified = false`,
				);
				updatedDoc.doc_verified = false;
				// Don't set verified_at to null - keep existing value if present
			}

			await this.userDocsRepository.save(updatedDoc);

			this.logger.log(
				`Document ${updatedDoc.doc_id} verification status updated: doc_verified=${updatedDoc.doc_verified}, verified_at=${updatedDoc.verified_at?.toISOString() || 'unchanged'}`,
			);
		} catch (verifyError) {
			this.logger.error(
				`VC verification error: ${verifyError.message}. Setting doc_verified = false`,
			);
			// Set doc_verified to false on error, but don't fail the operation
			updatedDoc.doc_verified = false;
			// Don't set verified_at to null - keep existing value
			await this.userDocsRepository.save(updatedDoc);
		}
	}

	/**
	 * Verify VC with API
	 * @param vcData - VC data to verify
	 * @param issuer - Issuer name
	 * @returns Verification result
	 */
	private async verifyVcWithApi(
		vcData: any,
		issuer?: string,
	): Promise<{ success: boolean; message?: string; errors?: any[] }> {
		try {
			const issuerName =
				issuer || process.env.VC_DEFAULT_ISSUER_NAME || 'dhiway';

			const verificationPayload = {
				credential: vcData,
				config: {
					method: 'online',
					issuerName: issuerName,
				},
			};

			const verificationUrl = process.env.VC_VERIFICATION_SERVICE_URL;
			if (!verificationUrl) {
				return {
					success: false,
					message: 'VC_VERIFICATION_SERVICE_URL env variable not set',
					errors: [],
				};
			}

			const response = await axios.post(
				`${verificationUrl}/verification`,
				verificationPayload,
				{
					headers: { 'Content-Type': 'application/json' },
					timeout: 8000,
				},
			);

			return {
				success: response.data?.success,
				message: response.data?.message,
				errors: response.data?.errors,
			};
		} catch (error) {
			this.logger.error(
				'VC Verification error:',
				error?.response?.data ?? error.message,
			);
			return {
				success: false,
				message:
					error?.response?.data?.message ??
					error.message ??
					'VC Verification failed',
				errors: error?.response?.data?.errors,
			};
		}
	}

	/**
	 * Update user profile after VC callback
	 * @param updatedDoc - The updated document
	 * @param callbackStatus - The callback status
	 */
	private async updateUserProfileAfterCallback(
		updatedDoc: UserDoc,
		callbackStatus: string,
	): Promise<void> {
		try {
			const user = await this.userRepository.findOne({
				where: { user_id: updatedDoc.user_id },
			});

			if (user) {
				await this.profilePopulator.populateProfile([user]);
				this.logger.log(
					`Profile updated for user: ${user.user_id} after ${callbackStatus} callback`,
				);
			}
		} catch (profileError) {
			this.logger.error(
				'Profile update failed after VC callback:',
				profileError,
			);
			// Don't fail the entire operation if profile update fails
		}
	}
}


