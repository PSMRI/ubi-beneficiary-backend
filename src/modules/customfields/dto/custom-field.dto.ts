import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

/**
 * DTO for custom field data in entity operations
 * @description Used when creating/updating entities with custom fields
 */
export class CustomFieldDto {
	/**
	 * Field ID
	 * @description Foreign key to the Field entity
	 */
	@ApiProperty({
		description: 'Field ID',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	@IsUUID()
	fieldId: string;

	/**
	 * Field value
	 * @description The actual value for this field instance
	 */
	@ApiProperty({
		description: 'Field value',
		example: 'Sample value',
	})
	@IsNotEmpty()
	value: any;

	/**
	 * Additional metadata for the field value
	 * @description JSON object containing value-specific metadata
	 */
	@ApiProperty({
		description: 'Additional metadata',
		required: false,
	})
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>;
}

/**
 * Response DTO for custom field with field definition
 * @description Used when returning custom fields with metadata
 */
export class CustomFieldResponseDto {
	/**
	 * Field definition ID
	 */
	@ApiProperty({
		description: 'Field definition ID',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	fieldId: string;

	/**
	 * Field name
	 */
	@ApiProperty({
		description: 'Field name',
		example: 'schoolName',
	})
	name: string;

	/**
	 * Field label
	 */
	@ApiProperty({
		description: 'Field label',
		example: 'School Name',
	})
	label: string;

	/**
	 * Field type
	 */
	@ApiProperty({
		description: 'Field type',
		example: 'text',
	})
	type: string;

	/**
	 * Field value
	 */
	@ApiProperty({
		description: 'Field value',
		example: 'Some text value',
	})
	value: any;

	/**
	 * Field parameters
	 */
	@ApiProperty({
		description: 'Field parameters',
		required: false,
	})
	fieldParams?: Record<string, any>;

	/**
	 * Field attributes
	 */
	@ApiProperty({
		description: 'Field attributes',
		required: false,
	})
	fieldAttributes?: Record<string, any>;

	/**
	 * Field value metadata
	 */
	@ApiProperty({
		description: 'Field value metadata',
		required: false,
	})
	metadata?: Record<string, any>;

	/**
	 * Whether the field is required
	 */
	@ApiProperty({
		description: 'Whether the field is required',
		example: false,
	})
	isRequired: boolean;

	/**
	 * Whether the field is hidden
	 */
	@ApiProperty({
		description: 'Whether the field is hidden',
		example: false,
	})
	isHidden: boolean;

	/**
	 * Field ordering
	 */
	@ApiProperty({
		description: 'Field ordering',
		example: 7,
	})
	ordering: number;
}
