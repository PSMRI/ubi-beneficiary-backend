import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for creating a new field value
 */
export class CreateFieldValueDto {
	/**
	 * Reference to the field definition
	 * @description Foreign key to the Field entity
	 */
	@ApiProperty({
		description: 'Reference to the field definition',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	@IsUUID()
	fieldId: string;

	/**
	 * Generic entity instance ID
	 * @description ID of the entity instance (e.g., userId, cohortId, etc.)
	 */
	@ApiProperty({
		description: 'Generic entity instance ID',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	@IsUUID()
	itemId: string;

	/**
	 * The field value
	 * @description The actual value for this field instance
	 */
	@ApiProperty({
		description: 'The field value',
		example: 'Some text value',
	})
	@IsString()
	value: string;

	/**
	 * Additional metadata for the field value
	 * @description JSON object containing value-specific metadata
	 */
	@ApiProperty({
		description: 'Additional metadata for the field value',
		example: {
			originalFilename: 'document.pdf',
			fileSize: 1024,
			mimeType: 'application/pdf',
		},
		required: false,
	})
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>;
}
