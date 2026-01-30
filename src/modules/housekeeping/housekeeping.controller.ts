import {
	Controller,
	Post,
	Get,
	Body,
	UnauthorizedException,
	Logger,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
} from '@nestjs/swagger';
import { HousekeepingService } from './housekeeping.service';
import {
	RegisterWatchersDto,
	MigrationStatusDto,
} from './dto/housekeeping.dto';

@ApiTags('Housekeeping')
@Controller('housekeeping')
export class HousekeepingController {
	private readonly logger = new Logger(HousekeepingController.name);

	constructor(private readonly housekeepingService: HousekeepingService) { }

	@Post('/register-watchers')
	@ApiOperation({
		summary: 'Register watchers for existing documents',
		description: 'Register watchers for existing documents that don\'t have watchers registered. Requires secret key authentication.',
	})
	@ApiBody({ type: RegisterWatchersDto })
	@ApiResponse({
		status: 200,
		description: 'Watcher registration completed successfully',
	})
	@ApiResponse({
		status: 401,
		description: 'Invalid secret key',
	})
	@ApiResponse({
		status: 500,
		description: 'Internal server error',
	})
	async registerWatchers(@Body() registerWatchersDto: RegisterWatchersDto) {
		try {
			return await this.housekeepingService.registerWatchersForExistingDocuments(
				registerWatchersDto.secretKey,
				registerWatchersDto.allDocuments,
				registerWatchersDto.documentIds,
				registerWatchersDto.forceReregister,
			);
		} catch (error) {
			this.logger.error('Error in registerWatchers:', error);
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException('HOUSEKEEPING_WATCHER_REGISTRATION_FAILED');
		}
	}

	@Get('/migration-status')
	@ApiOperation({
		summary: 'Get migration status',
		description: 'Get the status of various migration operations. Requires secret key authentication.',
	})
	@ApiResponse({
		status: 200,
		description: 'Migration status retrieved successfully',
	})
	@ApiResponse({
		status: 401,
		description: 'Invalid secret key',
	})
	@ApiResponse({
		status: 500,
		description: 'Internal server error',
	})
	async getMigrationStatus(@Body() migrationStatusDto: MigrationStatusDto) {
		try {
			return await this.housekeepingService.getMigrationStatus(
				migrationStatusDto.secretKey,
				migrationStatusDto.operation,
			);
		} catch (error) {
			this.logger.error('Error in getMigrationStatus:', error);
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException('HOUSEKEEPING_MIGRATION_STATUS_FAILED');
		}
	}
} 