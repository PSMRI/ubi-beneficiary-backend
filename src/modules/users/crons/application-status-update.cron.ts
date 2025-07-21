import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserService } from '../users.service';

@Injectable()
export class ApplicationStatusUpdate {
	constructor(
		private readonly userService: UserService,
	) {}

	@Cron('*/15 * * * *')
	async updateApplicationStatusCron() {
		try {
			Logger.log('Application Status Update CRON started at ' + new Date().toISOString());
			
			// Use the service method to process all application status updates
			const result = await this.userService.processApplicationStatusUpdates();
			
			Logger.log(`Application Status Update CRON completed successfully. ${(result.data as any)?.processedCount || 0} applications processed.`);
		} catch (error) {
			Logger.error(`Error in 'Update user application cron': ${error}`);
		}
	}
}
