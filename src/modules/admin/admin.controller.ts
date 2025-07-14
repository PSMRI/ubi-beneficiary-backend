import {
	Controller,
	Post,
	Body,
	UseGuards,
	Request,
	Get,
	Param,
	HttpStatus,
	BadRequestException,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBody,
	ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ConfigKeyDto, CreateOrUpdateConfigDto, ConfigResponseDto } from './dto';
import { AuthGuard } from '@modules/auth/auth.guard';
import { validate } from 'class-validator';

/**
 * Controller for admin operations
 * @description Provides API endpoints for administrative tasks like configuration management
 */
@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	/**
	 * Create or update configuration
	 * @param body Configuration data
	 * @param req Request object containing user information
	 * @description Creates a new configuration entry or updates an existing one
	 */
	@Post('config')
	@UseGuards(AuthGuard)
	@ApiOperation({
		summary: 'Create or update configuration',
		description: 'Creates a new configuration entry or updates an existing one. Requires authentication.',
	})
	@ApiBody({
		type: CreateOrUpdateConfigDto,
		examples: {
			stringValue: {
				summary: 'String Configuration',
				value: {
					key: 'app_name',
					value: 'My Application Name'
				}
			},
			numberValue: {
				summary: 'Number Configuration',
				value: {
					key: 'max_users',
					value: 1000
				}
			},
			booleanValue: {
				summary: 'Boolean Configuration',
				value: {
					key: 'maintenance_mode',
					value: true
				}
			},
			objectValue: {
				summary: 'Object Configuration',
				value: {
					key: 'email_settings',
					value: {
						smtp_host: 'smtp.example.com',
						smtp_port: 587,
						from_email: 'noreply@example.com'
					}
				}
			}
		}
	})
	@ApiResponse({
		status: 200,
		description: 'Configuration created or updated successfully',
		type: ConfigResponseDto
	})
	@ApiResponse({
		status: 400,
		description: 'Bad Request - Invalid input data',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 400 },
				error: { 
					type: 'array', 
					items: { type: 'string' },
					example: ['key must contain only letters, numbers, and underscores']
				}
			}
		}
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized - Invalid or missing authentication token'
	})
	async createOrUpdateConfig(@Body() body: CreateOrUpdateConfigDto, @Request() req) {
		// Validate key field
		const keyDto = new ConfigKeyDto();
		keyDto.key = body.key;

		// Validate the key field
		const errors = await validate(keyDto);
		if (errors.length > 0) {
			throw new BadRequestException({
				statusCode: HttpStatus.BAD_REQUEST,
				error: errors.map((error) =>
					Object.values(error.constraints).join(', '),
				),
			});
		}

		return await this.adminService.createOrUpdateConfig(
			{ key: body.key, value: body.value },
			req.user.keycloak_id,
		);
	}

	/**
	 * Get configuration by key
	 * @param params Parameters containing the configuration key
	 * @description Retrieves a configuration value by its key
	 */
	@Get('config/:key')
	@UseGuards(AuthGuard)
	@ApiOperation({
		summary: 'Get configuration by key',
		description: 'Retrieves a configuration value by its key. Requires authentication.',
	})
	@ApiParam({
		name: 'key',
		type: 'string',
		description: 'Configuration key identifier',
		example: 'app_name'
	})
	@ApiResponse({
		status: 200,
		description: 'Configuration retrieved successfully',
		type: ConfigResponseDto
	})
	@ApiResponse({
		status: 404,
		description: 'Configuration not found'
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized - Invalid or missing authentication token'
	})
	async getConfig(@Param() params: ConfigKeyDto) {
		return await this.adminService.getConfig(params.key);
	}
}
