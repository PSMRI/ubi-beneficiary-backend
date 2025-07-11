import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CreateFieldDto } from './create-field.dto';

/**
 * DTO for updating an existing custom field
 * @description Extends CreateFieldDto but makes all fields optional
 */
export class UpdateFieldDto extends PartialType(
	OmitType(CreateFieldDto, ['context'] as const)
) {
	/**
	 * Whether the field is active
	 * @description Allows soft deletion of fields
	 */
	@ApiProperty({
		description: 'Whether the field is active',
		example: true,
		required: false,
	})
	isActive?: boolean;
}
