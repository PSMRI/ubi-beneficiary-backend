import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class HousekeepingAuthDto {
	@ApiProperty({
		description: 'Secret key for housekeeping operations',
		example: 'your-secret-key-here',
	})
	@IsString()
	@IsNotEmpty()
	secretKey: string;
}

export class RegisterWatchersDto extends HousekeepingAuthDto {
	@ApiProperty({
		description: 'Whether to register watchers for all documents or only specific ones',
		example: true,
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	allDocuments?: boolean;

	@ApiProperty({
		description: 'Specific document IDs to register watchers for',
		example: ['doc-id-1', 'doc-id-2'],
		required: false,
	})
	@IsOptional()
	@IsString({ each: true })
	documentIds?: string[];

	@ApiProperty({
		description: 'Whether to force re-registration of existing watchers',
		example: false,
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	forceReregister?: boolean;
}

export class MigrationStatusDto extends HousekeepingAuthDto {
	@ApiProperty({
		description: 'Migration operation to check status for',
		example: 'register_watchers',
	})
	@IsString()
	@IsNotEmpty()
	operation: string;
} 