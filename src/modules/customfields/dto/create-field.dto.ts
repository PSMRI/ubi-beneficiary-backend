import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FieldType, FieldContext } from '@entities/field.entity';

export class CreateFieldDto {
  @ApiProperty({
    example: 'currentSchoolDistrict',
    description: 'The internal name of the field',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiProperty({
    example: 'Current School District',
    description: 'The display label of the field',
  })
  @IsString()
  @Length(1, 255)
  label: string;

  @ApiProperty({
    example: FieldContext.USERS,
    description: 'The entity type (e.g., "USERS", "COHORTS")',
    enum: FieldContext,
  })
  @IsEnum(FieldContext)
  context: FieldContext;

  @ApiProperty({
    example: 'User',
    description: 'Subtype or role',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  contextType?: string;

  @ApiProperty({
    example: FieldType.TEXT,
    description: 'Field type',
    enum: FieldType,
  })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({
    example: 7,
    description: 'Display order',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ordering?: number;

  @ApiProperty({
    example: false,
    description: 'Is the field required?',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    example: false,
    description: 'Is the field hidden?',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiProperty({
    example: 'tenant-123',
    description: 'Tenant ID if multi-tenant',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  tenantId?: string;

  @ApiProperty({
    example: {
      isCreate: false,
      options: [
        { name: 'Option 1', value: 'option1' },
        { name: 'Option 2', value: 'option2' },
      ],
    },
    description: 'Additional parameters for the field',
    required: false,
  })
  @IsOptional()
  @IsObject()
  fieldParams?: any;

  @ApiProperty({
    example: {
      isEditable: true,
      isRequired: false,
    },
    description: 'Field attributes',
    required: false,
  })
  @IsOptional()
  @IsObject()
  fieldAttributes?: any;

  @ApiProperty({
    example: {},
    description: 'Source info for dynamic fields',
    required: false,
  })
  @IsOptional()
  @IsObject()
  sourceDetails?: any;

  @ApiProperty({
    example: {},
    description: 'Dependency info',
    required: false,
  })
  @IsOptional()
  @IsObject()
  dependsOn?: any;
} 
