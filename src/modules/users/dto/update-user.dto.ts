import { IsOptional, IsString, IsEmail, Length, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CustomFieldValueDto } from './create-user.dto';

export class UpdateUserDto {
  @ApiProperty({
    example: 'John',
    description: 'The first name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'The last name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address of the user',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'google',
    description: 'The SSO provider (e.g., google, facebook)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  sso_provider?: string;

  @ApiProperty({
    example: '12345',
    description: 'The SSO ID provided by the provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  sso_id?: string;

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
        fieldId: '2cc58846-dbcf-45e9-8295-5e853c7f3af8',
        value: 'hellyyo',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldValueDto)
  customFields?: CustomFieldValueDto[];
}
