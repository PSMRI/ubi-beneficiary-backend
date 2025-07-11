import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldContext } from '../entities/field.entity';

/**
 * DTO for querying fields with filters
 */
export class QueryFieldsDto {
	/**
	 * Filter by context
	 * @description Entity context to filter fields
	 */
	@ApiProperty({
		description: 'Filter by context',
		enum: FieldContext,
		required: false,
	})
	@IsOptional()
	@IsEnum(FieldContext)
	context?: FieldContext;

	/**
	 * Filter by context type
	 * @description Context subtype to filter fields
	 */
	@ApiProperty({
		description: 'Filter by context type',
		example: 'User',
		required: false,
	})
	@IsOptional()
	@IsString()
	contextType?: string;

	/**
	 * Filter by required status
	 * @description Whether to filter by required fields
	 */
	@ApiProperty({
		description: 'Filter by required status',
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	isRequired?: boolean;

	/**
	 * Filter by hidden status
	 * @description Whether to filter by hidden fields
	 */
	@ApiProperty({
		description: 'Filter by hidden status',
		required: false,
	})
	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	isHidden?: boolean;
}
