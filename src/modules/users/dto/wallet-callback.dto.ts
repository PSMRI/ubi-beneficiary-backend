import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WalletCallbackDto {
	@ApiProperty({
		description: 'Unique identifier for the callback',
		example: 'abc123',
	})
	@IsString()
	@IsNotEmpty()
	identifier: string;

	@ApiProperty({
		description: 'Message describing the callback action',
		example: 'Registry Entry Updated',
	})
	@IsString()
	@IsNotEmpty()
	message: string;

	@ApiProperty({
		description: 'Type of the callback action',
		example: 'Update',
	})
	@IsString()
	@IsNotEmpty()
	type: string;

	@ApiProperty({
		description: 'Public ID of the record',
		example: 'xyz',
	})
	@IsString()
	@IsNotEmpty()
	recordPublicId: string;
}
