import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum IssuerType {
	ONLINE = 'online',
	OFFLINE = 'offline',
}

export class GetIssuersQueryDto {
	@ApiProperty({
		description: 'Filter issuers by type',
		enum: IssuerType,
		required: false,
		example: 'online',
	})
	@IsOptional()
	@IsEnum(IssuerType, { message: 'type must be either "online" or "offline"' })
	type?: IssuerType;
}

export class IssuerDto {
	@ApiProperty({
		description: 'Unique identifier for the issuer',
		example: 'dhiway',
	})
	id: string;

	@ApiProperty({
		description: 'Name of the issuer',
		example: 'Dhiway',
	})
	name: string;

	@ApiProperty({
		description: 'Type of issuer verification',
		enum: IssuerType,
		example: 'online',
	})
	type: string;

	@ApiProperty({
		description: 'Description of the issuer',
		example: 'Dhiway credential verification',
	})
	description: string;
}

export class GetIssuersResponseDto {
	@ApiProperty({
		description: 'Success status',
		example: true,
	})
	success: boolean;

	@ApiProperty({
		description: 'Total count of issuers',
		example: 3,
	})
	count: number;

	@ApiProperty({
		description: 'List of issuers',
		type: [IssuerDto],
	})
	data: IssuerDto[];
}

