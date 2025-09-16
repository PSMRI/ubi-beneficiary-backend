import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsEmail,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocDTO {
  @ApiProperty({
    description: 'The name of the document',
    example: 'Enrollment Certificate',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  doc_name: string;

  @ApiProperty({
    description: 'The type of the document',
    example: 'associationProof',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  doc_type: string;

  @ApiProperty({
    description: 'The subtype of the document',
    example: 'enrollmentCertificate',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  doc_subtype: string;

  @ApiProperty({
    description: 'Document data containing verifiable credentials or certificate information',
    example: {
      "@context": ["https://www.w3.org/2018/credentials/v1", "https://cord.network/2023/cred/v1"],
      "type": ["VerifiableCredential"],
      "issuer": "did:cord:example123456789",
      "issuanceDate": "2025-08-19T04:48:10.488Z",
      "credentialSubject": {
        "schoolid": "TEST123",
        "studentuniqueid": "TST45589",
        "schoolname": "Test College Example",
        "firstname": "TestFirstName",
        "lastname": "TestLastName",
        "academicyear": "2025",
        "class": "10",
        "locality": "TestCity",
        "district": "TestDistrict",
        "pin": 123456,
        "state": "TESTSTATE",
        "country": "TestCountry",
        "studentstatus": "Enrolled",
        "issuedby": "TestIssuer",
        "issuerauthority": "TestAuthority",
        "issueddate": "Thu, 07 Aug 2025 00:00:00 GMT",
        "validupto": "Sun, 31 Aug 2025 00:00:00 GMT"
      }
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  doc_data?: any;

  @ApiProperty({
    description: 'Source where the document was imported from',
    example: 'QR Code',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  imported_from: string;

  @ApiProperty({
    description: 'The datatype of the document',
    example: 'Application/JSON',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  doc_datatype: string;

  @ApiProperty({
    description: 'URL link to the document data source',
    example: 'https://example.com/verify/test-document.vc',
    maxLength: 1500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1500)
  doc_data_link?: string;

  @ApiProperty({
    description: 'Whether the watcher is registered for this document',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  watcher_registered?: boolean;

  @ApiProperty({
    description: 'Email for watcher registration notifications',
    example: 'admin@testschool.edu',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(500)
  watcher_email?: string;

  @ApiProperty({
    description: 'Callback URL for watcher registration',
    example: 'https://testschool.edu/api/watcher/callback',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  watcher_callback_url?: string;
} 