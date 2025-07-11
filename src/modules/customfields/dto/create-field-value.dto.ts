import {
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FieldValueItemDto {
  @ApiProperty({
    example: '5ace9c31-6b32-4327-b161-0828165ec32c',
    description: 'The field ID',
  })
  @IsUUID()
  fieldId: string;

  @ApiProperty({
    example: '10',
    description: 'The value for this field',
  })
  @IsString()
  value: string;
}

export class CreateFieldValueDto {
  @ApiProperty({
    example: 'user-123',
    description: 'The ID of the entity instance (e.g., userId, cohortId, etc.)',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    type: [FieldValueItemDto],
    description: 'Array of field values to create/update',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueItemDto)
  fields: FieldValueItemDto[];
} 
