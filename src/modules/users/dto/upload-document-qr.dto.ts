import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class UploadDocumentQrDto {
  @ApiProperty({
    description: 'The type of the document',
    example: 'casteProof',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  docType: string;

  @ApiProperty({
    description: 'The subtype of the document',
    example: 'casteCertificate',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  docSubType: string;

  @ApiProperty({
    description: 'The name of the document',
    example: 'Caste Certificate',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  docName: string;

  @ApiProperty({
    description: 'Source where the document was imported from (fixed to QR Code)',
    example: 'QR Code',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  importedFrom: string;

  @ApiProperty({
    description: 'VC issuer type (optional)',
    example: 'jharseva',
    maxLength: 50,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  issuer?: string;

  @ApiProperty({
    description: 'QR code content (can be URL, XML, JSON, encoded JSON, VC_URL, DOC_URL, PLAIN_TEXT, etc.)',
    example: 'https://example.com/qr-content or {"key": "value"} or <xml>...</xml>',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  qrContent: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The file to upload (PDF, JPG, JPEG, PNG) - optional',
    required: false,
  })
  @IsOptional()
  file?: any;
}

