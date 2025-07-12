import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomFieldDto } from '@modules/customfields/dto/custom-field.dto';

/**
 * DTO for saving custom fields for a user
 * @description Used when saving custom field values for a specific user
 */
export class SaveUserCustomFieldsDto {
  /**
   * Array of custom field values to save
   */
  @ApiProperty({
    description: 'Array of custom field values to save',
    type: [CustomFieldDto],
    example: [
      {
        fieldId: '550e8400-e29b-41d4-a716-446655440000',
        value: 'JSPM NTC',
        metadata: {
          source: 'manual_entry',
          verified: true,
        },
      },
      {
        fieldId: '550e8400-e29b-41d4-a716-446655440001',
        value: 'Maharashtra',
        metadata: {
          source: 'form_submission',
        },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields: CustomFieldDto[];
} 