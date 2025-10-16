import {
	IsUUID,
	IsString,
	IsNotEmpty,
	IsIn,
	IsOptional,
	MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserApplicationDto {
	@ApiProperty({
		description: 'Unique identifier of the user',
		type: String,
		format: 'uuid',
		example: '0deef2a1-90dd-49c7-90a5-fc293d89326a',
	})
	@IsUUID()
	user_id: string;

	@ApiProperty({
		description: 'Unique identifier for the benefit',
		type: String,
		maxLength: 255,
		example: 'qvpfldi73jgez6qf3rcd06a9',
	})
	@IsString()
	@IsNotEmpty()
	benefit_id: string;

	@ApiProperty({
		description: 'Benefit provider ID',
		type: String,
		maxLength: 255,
		example: 'bpp_id',
	})
	@IsString()
	@IsNotEmpty()
	benefit_provider_id: string;

	@ApiProperty({
		description: 'Benefit provider URI',
		type: String,
		maxLength: 255,
		example: 'https://bpp.com',
	})
	@IsString()
	@IsNotEmpty()
	benefit_provider_uri: string;

	@ApiProperty({
		description: 'External application ID',
		type: String,
		maxLength: 100,
		example: 'TLEXP_C8C57A3E_1756888693643',
	})
	@IsString()
	@IsOptional()
	@MaxLength(100)
	bpp_application_id: string;

	@ApiProperty({
		description: 'Order ID returned by the init API',
		type: String,
		maxLength: 100,
		example: 'ORDER_123456789',
		required: false,
	})
	@IsOptional()
	@IsString()
	order_id?: string;

	@ApiProperty({
		description: 'Transaction ID returned by the init API',
		type: String,
		maxLength: 100,
		example: 'TRANSACTION_123456789',
		required: false,
	})
	@IsOptional()
	@IsString()
	transaction_id?: string;

	@ApiProperty({
		description: 'Application Name',
		type: String,
		required: false,
		example:
			'[Tekdi Test 2] Post-Matric Scholarship for Students with Disabilities',
	})
	@IsOptional() // Optional
	@IsString() // Optional, if you want to validate it as a string
	application_name?: string;

	@ApiProperty({
		description: 'Status of the application',
		type: String,
		maxLength: 20,
		example: 'application pending',
	})
	@IsString()
	@IsIn([
		'submitted',
		'approved',
		'rejected',
		'application pending',
		'application initiated',
	])
	@IsNotEmpty()
	status: string;

	@ApiProperty({
		example: '{}',
		description: 'Application data',
		required: false,
	})
	@IsOptional() // Optional
	application_data?: Record<string, any>;
}
