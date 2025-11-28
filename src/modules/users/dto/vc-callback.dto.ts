import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class VcCallbackDto {
	@ApiProperty({
		description: 'Public ID (UUID) from VC issuance platform',
		example: 'ff8f29d1-8ba5-49a3-bcc2-0e277f7c1790',
	})
	@IsString()
	@IsNotEmpty()
	publicId: string;

	@ApiProperty({
		description: 'Status of the VC issuance',
		example: 'published',
		enum: ['published', 'rejected', 'deleted', 'revoked'],
	})
	@IsString()
	@IsNotEmpty()
	@IsIn(['published', 'rejected', 'deleted', 'revoked'], {
		message: 'Status must be one of: published, rejected, deleted, revoked',
	})
	status: 'published' | 'rejected' | 'deleted' | 'revoked';

	@ApiProperty({
		description: 'Timestamp when the status change occurred',
		example: '2025-11-28T10:30:00Z',
		required: false,
	})
	@IsOptional()
	@IsString()
	timestamp?: string;
}

