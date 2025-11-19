import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'The type of the document',
    example: 'associationProof',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  docType: string;

  @ApiProperty({
    description: 'The subtype of the document',
    example: 'enrollmentCertificate',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  docSubType: string;

  @ApiProperty({
    description: 'The name of the document',
    example: 'Enrollment Certificate',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  docName: string;

  @ApiProperty({
    description: 'Source where the document was imported from',
    example: 'Manual Upload',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  importedFrom: string;

  @ApiProperty({
    description: 'VC issuer type (optional)',
    example: 'dhiway',
    maxLength: 50,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  issuer?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The file to upload (PDF, JPG, JPEG, PNG)',
  })
  file: any;
}

