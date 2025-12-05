import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronState } from '../entities/cron-state.entity';
import { VcEventProcessingLog } from '../entities/vc-event-processing-log.entity';
import { UserDoc } from '@entities/user_docs.entity';
import { DhiwayAnalyticsService } from '../../../services/dhiway-analytics/dhiway-analytics.service';
import { VcProcessingService } from '../services/vc-processing.service';
import { VC_PROCESSING_CONFIG } from '../../../config/vc-processing.config';
import { mapDhiwayTypeToStatus } from '../../../config/dhiway-analytics.config';
import { subMinutes } from 'date-fns';

@Injectable()
export class DhiwayVcProcessingCron {
	private readonly logger = new Logger(DhiwayVcProcessingCron.name);
	private readonly cronName = 'dhiway-vc-processing';
	private readonly lookbackMinutes: number;
	private readonly cronSchedule: string;

	constructor(
		@InjectRepository(CronState)
		private readonly cronStateRepository: Repository<CronState>,
		@InjectRepository(VcEventProcessingLog)
		private readonly logRepository: Repository<VcEventProcessingLog>,
		@InjectRepository(UserDoc)
		private readonly userDocsRepository: Repository<UserDoc>,
		private readonly analyticsService: DhiwayAnalyticsService,
		private readonly vcProcessingService: VcProcessingService,
	) {
		this.lookbackMinutes = VC_PROCESSING_CONFIG.lookbackMinutes;
		this.cronSchedule = VC_PROCESSING_CONFIG.cronSchedule;
	}

	/**
	 * Main cron job - runs on configurable schedule (default: every 2 hours)
	 * Processes VC events from last_processed_to to (current_time - lookback_minutes)
	 * This ensures we don't process events that are too recent
	 */
	@Cron(VC_PROCESSING_CONFIG.cronSchedule)
	async processVcEvents() {
		const startTime = new Date();
		this.logger.log(
			`[${this.cronName}] Starting VC processing cron job at ${startTime.toISOString()}`,
		);

		try {
			const cronState = await this.getOrCreateCronState();
			const timeWindow = await this.calculateTimeWindow(cronState);

			if (!this.validateTimeWindow(timeWindow)) {
				return;
			}

			// Fetch analytics data - exit early if API fails
			const analyticsResponse = await this.fetchAndValidateAnalyticsData(
				timeWindow,
			);

			if (!analyticsResponse) {
				this.logger.error(
					`[${this.cronName}] Analytics API unavailable or failed. Skipping cron execution. State not updated.`,
				);
				return;
			}

			const recordsToProcess = await this.filterRecordsInUserDocs(
				analyticsResponse.data,
			);

			const { successCount, failureCount } =
				await this.processRecords(recordsToProcess, timeWindow);

			// Update state after processing (even if some records failed)
			await this.updateCronState(cronState, timeWindow.to);

			const duration = Date.now() - startTime.getTime();
			this.logger.log(
				`[${this.cronName}] Completed processing. Success: ${successCount}, Failed: ${failureCount}, Duration: ${duration}ms`,
			);
		} catch (error) {
			this.logger.error(
				`[${this.cronName}] Fatal error in cron job: ${error.message}`,
				error.stack,
			);
		}
	}

	/**
	 * Validate time window
	 */
	private validateTimeWindow(timeWindow: {
		from: Date;
		to: Date;
	}): boolean {
		if (timeWindow.from >= timeWindow.to) {
			this.logger.log(
				`[${this.cronName}] No new data to process. Window: ${timeWindow.from.toISOString()} to ${timeWindow.to.toISOString()}`,
			);
			return false;
		}

		this.logger.log(
			`[${this.cronName}] Processing time window: ${timeWindow.from.toISOString()} to ${timeWindow.to.toISOString()}`,
		);
		return true;
	}

	/**
	 * Fetch and validate analytics data
	 * Returns null if API fails - cron will exit early without updating state
	 */
	private async fetchAndValidateAnalyticsData(timeWindow: {
		from: Date;
		to: Date;
	}) {
		try {
			const analyticsResponse = await this.analyticsService.getSummaryForVC(
				timeWindow.from.toISOString(),
				timeWindow.to.toISOString(),
			);

			if (!analyticsResponse?.success) {
				this.logger.error(
					`[${this.cronName}] Analytics API returned unsuccessful response. Response: ${JSON.stringify(analyticsResponse)}`,
				);
				return null;
			}

			if (!Array.isArray(analyticsResponse.data)) {
				this.logger.error(
					`[${this.cronName}] Invalid response structure. Expected data array but got: ${typeof analyticsResponse.data}`,
				);
				return null;
			}

			this.logger.log(
				`[${this.cronName}] Found ${analyticsResponse.data.length} records from Analytics API`,
			);

			return analyticsResponse;
		} catch (error) {
			this.logger.error(
				`[${this.cronName}] Failed to fetch analytics data: ${error.message}`,
				error.stack,
			);
			return null;
		}
	}

	/**
	 * Filter records to only those that exist in user_docs table
	 */
	private async filterRecordsInUserDocs(
		records: Array<{ type: string; record_public_id: string }>,
	) {
		const recordsToProcess: typeof records = [];
		let skippedCount = 0;

		for (const record of records) {
			const userDoc = await this.userDocsRepository.findOne({
				where: {
					vc_public_id: record.record_public_id,
				},
			});

			if (!userDoc) {
				skippedCount++;
				continue;
			}

			recordsToProcess.push(record);
		}

		this.logger.log(
			`[${this.cronName}] Processing ${recordsToProcess.length} records (${skippedCount} skipped - not in user_docs)`,
		);

		return recordsToProcess;
	}

	/**
	 * Process records and return success/failure counts
	 * @param records - Records to process
	 * @param timeWindow - Time window for this batch
	 */
	private async processRecords(
		records: Array<{ type: string; record_public_id: string }>,
		timeWindow: { from: Date; to: Date },
	): Promise<{ successCount: number; failureCount: number }> {
		let successCount = 0;
		let failureCount = 0;

		for (const record of records) {
			try {
				const status = mapDhiwayTypeToStatus(record.type);

				if (!status) {
					this.logger.warn(
						`[${this.cronName}] Unknown type '${record.type}' for record ${record.record_public_id}, skipping`,
					);
					continue;
				}

				// Check if record was already successfully processed in this batch (idempotency check)
				const existingLog = await this.logRepository.findOne({
					where: {
						vc_public_id: record.record_public_id,
						status_processed: 'success',
						batch_from: timeWindow.from,
						batch_to: timeWindow.to,
					},
					order: {
						processed_at: 'DESC',
					},
				});

				if (existingLog) {
					this.logger.log(
						`[${this.cronName}] Record ${record.record_public_id} already successfully processed in this batch, skipping`,
					);
					continue;
				}

				const result =
					await this.vcProcessingService.processVcEventInternal(
						record.record_public_id,
						status,
						timeWindow.to.toISOString(),
					);

				await this.logProcessingResult(
					record.record_public_id,
					record.type,
					result.success,
					result.error,
					timeWindow.from,
					timeWindow.to,
				);

				if (result.success) {
					successCount++;
					this.logger.log(
						`[${this.cronName}] Successfully processed record ${record.record_public_id} with status ${status}`,
					);
				} else {
					failureCount++;
					this.logger.error(
						`[${this.cronName}] Failed to process record ${record.record_public_id}: ${result.error}`,
					);
				}
			} catch (error) {
				failureCount++;
				this.logger.error(
					`[${this.cronName}] Error processing record ${record.record_public_id}: ${error.message}`,
					error.stack,
				);

				await this.logProcessingResult(
					record.record_public_id,
					record.type,
					false,
					error.message,
					timeWindow.from,
					timeWindow.to,
				);
			}
		}

		return { successCount, failureCount };
	}

	/**
	 * Get or create cron state
	 */
	private async getOrCreateCronState(): Promise<CronState> {
		let cronState = await this.cronStateRepository.findOne({
			where: { cron_name: this.cronName },
		});

		if (!cronState) {
			// Initialize with current time minus lookback window to avoid processing recent data
			const initialTime = subMinutes(
				new Date(),
				this.lookbackMinutes,
			);

			cronState = this.cronStateRepository.create({
				cron_name: this.cronName,
				last_processed_to: initialTime,
			});

			cronState = await this.cronStateRepository.save(cronState);
			this.logger.log(
				`[${this.cronName}] Created initial cron state with last_processed_to: ${initialTime.toISOString()}`,
			);
		}

		return cronState;
	}

	/**
	 * Calculate next time window based on cron state
	 * Processes from last_processed_to to (current_time - lookback_minutes)
	 * This ensures we don't process events that are too recent
	 */
	private async calculateTimeWindow(
		cronState: CronState,
	): Promise<{ from: Date; to: Date }> {
		const now = new Date();
		const from = new Date(cronState.last_processed_to);
		// Process up to current time minus lookback window
		const to = subMinutes(now, this.lookbackMinutes);

		// Ensure 'to' is not before 'from' (shouldn't happen, but safety check)
		const actualTo = Math.max(to.getTime(), from.getTime());
		return { from, to: new Date(actualTo) };
	}

	/**
	 * Update cron state after successful batch processing
	 */
	private async updateCronState(
		cronState: CronState,
		lastProcessedTo: Date,
	): Promise<void> {
		cronState.last_processed_to = lastProcessedTo;
		await this.cronStateRepository.save(cronState);
		this.logger.log(
			`[${this.cronName}] Updated cron state: last_processed_to = ${lastProcessedTo.toISOString()}`,
		);
	}

	/**
	 * Log processing result to database
	 * Logs are ordered by processed_at DESC (newest first) when queried
	 * @param type - The Dhiway Analytics type (record_anchored, record_revoked, record_deleted)
	 */
	private async logProcessingResult(
		vcPublicId: string,
		type: string,
		success: boolean,
		errorMessage: string | undefined,
		batchFrom: Date,
		batchTo: Date,
	): Promise<void> {
		const log = this.logRepository.create({
			vc_public_id: vcPublicId,
			type: type,
			status_processed: success ? 'success' : 'failed',
			error_message: errorMessage || null,
			processed_at: new Date(),
			batch_from: batchFrom,
			batch_to: batchTo,
		});

		await this.logRepository.save(log);
	}
}

