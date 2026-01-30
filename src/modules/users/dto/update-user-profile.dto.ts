import { IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileDto {
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
    example: 'My own phone',
    description: 'Whose phone number this is (e.g., "My own phone", "Father\'s phone", "Mother\'s phone")',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  whosePhoneNumber?: string;
}

