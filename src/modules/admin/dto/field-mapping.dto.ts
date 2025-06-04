import { IsString, IsNotEmpty } from 'class-validator';

export class FieldMappingDto {
	@IsString()
	@IsNotEmpty()
	key: string;

	value: any;
}
