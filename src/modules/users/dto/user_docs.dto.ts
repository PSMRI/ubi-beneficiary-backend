import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDocDTO {
  @ApiProperty({
    description: 'The UUID of the user',
    example: 'a3d8fa45-bdfa-49d1-8b3f-54bafcf3aabb',
  })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: 'The type of the document (e.g.Marksheet)',
    example: 'Marksheet',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  doc_type: string;

  @ApiProperty({
    description: 'The subtype of the document',
    example: '10th  marksheet',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  doc_subtype: string;

  @ApiProperty({
    description: 'The name of the document',
    example: 'Income Certificate for John Doe',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  doc_name: string;

  @ApiProperty({
    description: 'Source where the document was imported from',
    example: 'Government Portal',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  imported_from: string;

  @ApiProperty({
    description: 'The path where the document is stored',
    example: '/documents/income_certificate.pdf',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  doc_path?: string;

  @ApiProperty({
    description: 'The path where the document data fetched from',
    example: '/documents/income_certificate.json',
    maxLength: 1500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1500)
  doc_data_link?: string;

  @ApiProperty({
    description: 'Additional document data',
    example: 'Document data will be stored as encrypted',
    required: false,
  })
  @IsOptional()
  doc_data?: any; // Can be object, array, or null

  @ApiProperty({
    description: 'The datatype of the document (e.g. PDF, JPG,JSON)',
    example: 'PDF',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  doc_datatype: string;

  @ApiProperty({
    description: 'Whether the watcher is registered',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  watcher_registered?: boolean;

  @ApiProperty({
    description: 'Email for watcher registration',
    example: 'watcher@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(500)
  watcher_email?: string;

  @ApiProperty({
    description: 'Callback URL for watcher registration',
    example: 'http://localhost:3018/api/wallet/vcs/watch/callback',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  watcher_callback_url?: string;
}
