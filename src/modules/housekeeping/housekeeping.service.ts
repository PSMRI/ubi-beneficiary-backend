import {
	Injectable,
	UnauthorizedException,
	Logger,
	HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserDoc } from '@entities/user_docs.entity';
import { User } from '@entities/user.entity';
import { SuccessResponse } from 'src/common/responses/success-response';
import { ErrorResponse } from 'src/common/responses/error-response';
import axios from 'axios';

@Injectable()
export class HousekeepingService {
	private readonly logger = new Logger(HousekeepingService.name);

	constructor(
		@InjectRepository(UserDoc)
		private readonly userDocsRepository: Repository<UserDoc>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly configService: ConfigService
	) {}

	/**
	 * Validate the secret key for housekeeping operations
	 */
	private validateSecretKey(secretKey: string): boolean {
		const expectedSecretKey = this.configService.get<string>('HOUSEKEEPING_SECRET_KEY');
		return secretKey === expectedSecretKey;
	}

	/**
	 * Register watchers for existing documents
	 */
	async registerWatchersForExistingDocuments(
		secretKey: string,
		allDocuments: boolean = false,
		documentIds?: string[],
		forceReregister: boolean = false,
	) {
		try {
			// Validate secret key
			if (!this.validateSecretKey(secretKey)) {
				throw new UnauthorizedException('Invalid secret key');
			}

			this.logger.log('Starting watcher registration for existing documents');

			// Build query for documents
			let query = this.userDocsRepository.createQueryBuilder('doc')
				.leftJoinAndSelect('doc.user', 'user')
				.where('doc.doc_data_link IS NOT NULL')
				.andWhere('doc.doc_data_link != :empty', { empty: '' });

			// If not all documents, filter by specific IDs
			if (!allDocuments && documentIds && documentIds.length > 0) {
				query = query.andWhere('doc.doc_id IN (:...documentIds)', { documentIds });
			}

			// If not forcing re-registration, exclude documents that already have watchers
			if (!forceReregister) {
				query = query.andWhere('(doc.watcher_registered IS NULL OR doc.watcher_registered = :registered)', { registered: false });
			}

			const documents = await query.getMany();

			if (documents.length === 0) {
				return new SuccessResponse({
					statusCode: HttpStatus.OK,
					message: 'No documents found for watcher registration',
					data: {
						totalDocuments: 0,
						processedDocuments: 0,
						successfulRegistrations: 0,
						failedRegistrations: 0,
					},
				});
			}

			this.logger.log(`Found ${documents.length} documents for watcher registration`);

			let successfulRegistrations = 0;
			let failedRegistrations = 0;
			const results = [];

			// Process documents in batches to avoid overwhelming the system
			const batchSize = 10;
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize);
				
				// Process batch concurrently
				const batchPromises = batch.map(async (doc) => {
					try {
						const result = await this.registerWatcherForDocument(doc);
						if (result.success) {
							successfulRegistrations++;
						} else {
							failedRegistrations++;
						}
						return result;
					} catch (error) {
						failedRegistrations++;
						this.logger.error(`Failed to register watcher for document ${doc.doc_id}:`, error);
						return {
							docId: doc.doc_id,
							success: false,
							error: error.message,
						};
					}
				});

				const batchResults = await Promise.allSettled(batchPromises);
				results.push(...batchResults.map(p => p.status === 'fulfilled' ? p.value : null).filter(Boolean));

				// Add delay between batches to avoid rate limiting
				if (i + batchSize < documents.length) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}

			this.logger.log(`Watcher registration completed. Success: ${successfulRegistrations}, Failed: ${failedRegistrations}`);

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'Watcher registration completed',
				data: {
					totalDocuments: documents.length,
					processedDocuments: results.length,
					successfulRegistrations,
					failedRegistrations,
					results: results.slice(0, 50), // Limit results to first 50 for response size
				},
			});

		} catch (error) {
			this.logger.error('Error in registerWatchersForExistingDocuments:', error);
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: error.message || 'Failed to register watchers',
			});
		}
	}

	/**
	 * Register watcher for a single document
	 */
	private async registerWatcherForDocument(doc: UserDoc): Promise<{ success: boolean; docId: string; message?: string; error?: string }> {
		try {
			// Extract identifier and recordPublicId from doc_data_link
			const docDataLink = doc.doc_data_link;
			if (!docDataLink) {
				return {
					success: false,
					docId: doc.doc_id,
					error: 'No doc_data_link found',
				};
			}

			// Parse the URL to extract identifier and recordPublicId
			const urlParts = docDataLink.split('/');
			const fileName = urlParts[urlParts.length - 1]; // Get the last part (filename.json)
			const identifier = fileName.replace('.json', '');

			// Extract recordPublicId from the URL path
			const recordPublicId = urlParts[urlParts.length - 2] || identifier;

			// Get user wallet token
			const user = await this.userRepository.findOne({
				where: { user_id: doc.user_id },
			});

			if (!user) {
				return {
					success: false,
					docId: doc.doc_id,
					error: 'User not found',
				};
			}

			// Get wallet token from user
			const walletToken = user.walletToken;
			if (!walletToken) {
				return {
					success: false,
					docId: doc.doc_id,
					error: 'No wallet token found for user',
				};
			}

			// Register watcher using the existing logic from users service
			const callbackUrl = `${this.configService.get('BASE_URL')}/users/wallet-callback`;
			const email = this.configService.get('DHIWAY_WATCHER_EMAIL') || '';

			const walletUrl = `${this.configService.get('WALLET_BASE_URL')}/api/wallet/vcs/watch`;

			if (!walletUrl || !walletToken) {
				return {
					success: false,
					docId: doc.doc_id,
					error: 'Wallet configuration not found',
				};
			}

			const payload = {
				identifier: identifier,
				recordPublicId: recordPublicId,
				email: email,
				callbackUrl: callbackUrl,
			};

			const response = await axios.post(walletUrl, payload, {
				headers: {
					'Authorization': `Bearer ${walletToken}`,
					'Content-Type': 'application/json',
				},
				timeout: 10000,
			});

			if (response.status === 200 || response.status === 201) {
				// Update document to mark watcher as registered
				doc.watcher_registered = true;
				doc.watcher_email = email;
				doc.watcher_callback_url = callbackUrl;
				await this.userDocsRepository.save(doc);

				return {
					success: true,
					docId: doc.doc_id,
					message: 'Watcher registered successfully',
				};
			} else {
				return {
					success: false,
					docId: doc.doc_id,
					error: `Wallet API returned status ${response.status}`,
				};
			}

		} catch (error) {
			this.logger.error(`Error registering watcher for document ${doc.doc_id}:`, error);
			return {
				success: false,
				docId: doc.doc_id,
				error: error.message || 'Unknown error',
			};
		}
	}

	/**
	 * Get migration status
	 */
	async getMigrationStatus(secretKey: string, operation: string) {
		try {
			// Validate secret key
			if (!this.validateSecretKey(secretKey)) {
				throw new UnauthorizedException('Invalid secret key');
			}

			if (operation === 'register_watchers') {
				return await this.getWatcherRegistrationStatus();
			}

			return new ErrorResponse({
				statusCode: HttpStatus.BAD_REQUEST,
				errorMessage: `Unknown operation: ${operation}`,
			});
		} catch (error) {
			this.logger.error('Error in getMigrationStatus:', error);
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: error.message || 'Failed to get migration status',
			});
		}
	}

	/**
	 * Get watcher registration status
	 */
	private async getWatcherRegistrationStatus() {
		try {
			const totalDocuments = await this.userDocsRepository.count({
				where: {
					doc_data_link: ILike('%.json'),
				},
			});

			const registeredWatchers = await this.userDocsRepository.count({
				where: {
					doc_data_link: ILike('%.json'),
					watcher_registered: true,
				},
			});

			const unregisteredWatchers = totalDocuments - registeredWatchers;

			return new SuccessResponse({
				statusCode: HttpStatus.OK,
				message: 'Watcher registration status retrieved',
				data: {
					totalDocuments,
					registeredWatchers,
					unregisteredWatchers,
					registrationPercentage: totalDocuments > 0 ? (registeredWatchers / totalDocuments) * 100 : 0,
				},
			});

		} catch (error) {
			this.logger.error('Error getting watcher registration status:', error);
			return new ErrorResponse({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				errorMessage: 'Failed to get watcher registration status',
			});
		}
	}
} 