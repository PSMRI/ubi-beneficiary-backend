import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfigKeyDto {
	@ApiProperty({
		description: 'Configuration key identifier',
		example: 'vcConfiguration',
		pattern: '^[a-zA-Z0-9_]+$'
	})
	@IsString({ message: 'key must be a string' })
	@IsNotEmpty({ message: 'key is required' })
	@Matches(/^[a-zA-Z0-9_]+$/, { message: 'key must contain only letters, numbers, and underscores' })
	key: string;
}

export class CreateOrUpdateConfigDto {
	@ApiProperty({
		description: 'Configuration key identifier',
		example: 'vcConfiguration',
		pattern: '^[a-zA-Z0-9_]+$'
	})
	@IsString({ message: 'key must be a string' })
	@IsNotEmpty({ message: 'key is required' })
	@Matches(/^[a-zA-Z0-9_]+$/, { message: 'key must contain only letters, numbers, and underscores' })
	key: string;

	@ApiProperty({
		description: 'Configuration value (can be object, array)',
		example: [
			{
				"documentType": [
					"associationProof",
					"bankAccountProof",
					"birthProof",
					"casteProof",
				]
			}
		],
		oneOf: [
			{ type: 'array' },
			{ type: 'object' }
		]
	})
	@IsNotEmpty({ message: 'value is required' })
	value: any;
}

export class ConfigResponseDto {
	@ApiProperty({
		description: 'Unique identifier for the configuration',
		example: '550e8400-e29b-41d4-a716-446655440000'
	})
	id: string;

	@ApiProperty({
		description: 'Configuration key identifier',
		example: 'documentTypeConfiguration'
	})
	key: string;

	@ApiProperty({
		description: 'Configuration value',
		example: [
			"associationProof",
			"bankAccountProof",
			"birthProof",
			"casteProof"
		  ]
	})
	value: any;

	@ApiProperty({
		description: 'User ID who created/updated the configuration',
		example: 'user123'
	})
	created_by: string;

	@ApiProperty({
		description: 'Creation timestamp',
		example: '2024-01-15T10:30:00.000Z'
	})
	created_at: string;

	@ApiProperty({
		description: 'Last update timestamp',
		example: '2024-01-15T10:30:00.000Z'
	})
	updated_at: string;
}
