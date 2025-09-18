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

// Helper function to reduce duplication for required string fields
function RequiredStringField(description: string, example: string, maxLength: number = 255) {
  return function (target: any, propertyKey: string) {
    ApiProperty({
      description,
      example,
      maxLength,
    })(target, propertyKey);
    IsString()(target, propertyKey);
    IsNotEmpty()(target, propertyKey);
    MaxLength(maxLength)(target, propertyKey);
  };
}

// Helper function for optional string fields
function OptionalStringField(description: string, example: string, maxLength: number = 255) {
  return function (target: any, propertyKey: string) {
    ApiProperty({
      description,
      example,
      maxLength,
      required: false,
    })(target, propertyKey);
    IsString()(target, propertyKey);
    IsOptional()(target, propertyKey);
    MaxLength(maxLength)(target, propertyKey);
  };
}

// Helper function for optional boolean fields
function OptionalBooleanField(description: string, example: boolean) {
  return function (target: any, propertyKey: string) {
    ApiProperty({
      description,
      example,
      required: false,
    })(target, propertyKey);
    IsOptional()(target, propertyKey);
    IsBoolean()(target, propertyKey);
  };
}

export class UploadDocDTO {
  @RequiredStringField('The name of the document', 'Enrollment Certificate')
  doc_name: string;

  @RequiredStringField('The type of the document', 'associationProof', 50)
  doc_type: string;

  @RequiredStringField('The subtype of the document', 'enrollmentCertificate')
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

  @RequiredStringField('Source where the document was imported from', 'QR Code')
  imported_from: string;

  @RequiredStringField('The datatype of the document', 'Application/JSON', 100)
  doc_datatype: string;

  @OptionalStringField('URL link to the document data source', 'https://example.com/verify/test-document.vc', 1500)
  doc_data_link?: string;

  @OptionalBooleanField('Whether the watcher is registered for this document', false)
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

  @OptionalStringField('Callback URL for watcher registration', 'https://testschool.edu/api/watcher/callback', 1500)
  watcher_callback_url?: string;
} 