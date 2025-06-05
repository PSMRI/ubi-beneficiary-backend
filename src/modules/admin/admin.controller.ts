import {
	Controller,
	Post,
	Body,
	UseGuards,
	Request,
	Get,
	Param,
	HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { FieldMappingDto } from './dto';
import { AuthGuard } from '@modules/auth/auth.guard';

@Controller('admin')
export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	@Post('config')
	@UseGuards(AuthGuard)
	async createOrUpdatesettings(@Body() body: any, @Request() req) {
		const mapping: FieldMappingDto = {
			key: body.key,
			value: body.value,
		};
		const result = await this.adminService.createOrUpdatesettings(
			mapping,
			req.user.keycloak_id,
		);
		return {
			statusCode: HttpStatus.OK,
			message: 'Setting saved successfully',
			data: result,
		};
	}

	@Get('config/:key')
	@UseGuards(AuthGuard)
	async getSettings(@Param('key') key: string) {
		const result = await this.adminService.getSettings(key);
		return {
			statusCode: HttpStatus.OK,
			message: 'Setting retrieved successfully',
			data: result,
		};
	}
}
