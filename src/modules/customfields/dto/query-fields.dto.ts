import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FieldContext, FieldType } from '@entities/field.entity';

export class QueryFieldsDto {
  @ApiProperty({
    example: FieldContext.USERS,
    description: 'Filter by context',
    enum: FieldContext,
    required: false,
  })
  @IsOptional()
  @IsEnum(FieldContext)
  context?: FieldContext;

  @ApiProperty({
    example: 'User',
    description: 'Filter by context type',
    required: false,
  })
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiProperty({
    example: FieldType.TEXT,
    description: 'Filter by field type',
    enum: FieldType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FieldType)
  type?: FieldType;

  @ApiProperty({
    example: false,
    description: 'Filter by required status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    example: false,
    description: 'Filter by hidden status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiProperty({
    example: 'tenant-123',
    description: 'Filter by tenant ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
} 
