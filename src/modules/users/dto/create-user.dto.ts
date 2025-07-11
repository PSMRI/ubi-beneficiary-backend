import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  IsDate,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CustomFieldValueDto {
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

export class CreateUserDto {
  @ApiProperty({ example: 'John', description: 'The first name of the user' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'The middle name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  middleName?: string;

  @ApiProperty({ example: 'Doe', description: 'The last name of the user' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiProperty({
    example: 'google',
    description: 'The SSO provider (e.g., google, facebook)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  sso_provider: string;

  @ApiProperty({
    example: '12345',
    description: 'The SSO ID provided by the provider',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  sso_id: string;

  @ApiProperty({
    example: '555-555-5555',
    description: 'The phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  phoneNumber?: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'The date of birth of the user',
    required: false,
  })
  @IsOptional()
  @IsDate()
  dob?: Date;

  @ApiProperty({
    example: 'path/to/image.jpg',
    description: 'The profile image of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  image?: string;

  @ApiProperty({
    type: [CustomFieldValueDto],
    description: 'Custom field values for the user',
    required: false,
    example: [
      {
        fieldId: '5ace9c31-6b32-4327-b161-0828165ec32c',
        value: '10',
      },
      {
        fieldId: '2fb99694-ba65-49d3-9278-87957c95bc91',
        value: '100000',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldValueDto)
  customFields?: CustomFieldValueDto[];

  @IsOptional()
  @IsBoolean()
  fieldsVerified: boolean
}
