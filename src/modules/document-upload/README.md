# Document Upload Module

A generic, reusable document upload module that can be used across the application by any module that needs file upload capabilities.

## Features

- **Generic & Reusable** - Can be used by users, admin, organizations, or any other module
- **File Type Validation** - Validates file types using magic numbers (prevents file type spoofing)
- **Storage Agnostic** - Works with both local storage and S3
- **Pre-signed URLs** - Automatically generates temporary download URLs for S3
- **Secure** - Implements multiple layers of validation (MIME type, file signature, size)
- **Modular** - Easy to import and use in any module

## Supported File Types

- PDF (`.pdf`)
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)

## Installation

### 1. Import the Module

Add `DocumentUploadModule` to your module's imports:

```typescript
import { DocumentUploadModule } from '@modules/document-upload/document-upload.module';

@Module({
  imports: [
    // ... other imports
    DocumentUploadModule,
  ],
  // ... rest of module
})
export class YourModule {}
```

### 2. Inject the Service

Inject `DocumentUploadService` into your service:

```typescript
import { DocumentUploadService } from '@modules/document-upload/document-upload.service';

@Injectable()
export class YourService {
  constructor(
    private readonly documentUploadService: DocumentUploadService,
  ) {}
}
```

## Usage Examples

### Upload a File

```typescript
async uploadDocument(file: Express.Multer.File, ownerId: string) {
  const uploadResult = await this.documentUploadService.uploadFile(
    file,
    {
      docType: 'identity',
      docSubType: 'passport',
      docName: 'Passport',
      importedFrom: 'Manual Upload',
    },
    ownerId, // user_id, org_id, admin_id, etc.
  );

  // uploadResult contains:
  // {
  //   filePath: 'uploads/dev/user-id/uuid.pdf',
  //   fileExtension: '.pdf',
  //   docDatatype: 'PDF',
  //   uploadedAt: Date
  // }

  // Save to your database
  // ...
}
```

### Generate Download URL

```typescript
async getDocumentDownloadUrl(filePath: string) {
  // Returns pre-signed URL for S3 or local path for local storage
  const downloadUrl = await this.documentUploadService.generateDownloadUrl(filePath);
  return downloadUrl;
}
```

### Delete a File

```typescript
async deleteDocument(filePath: string) {
  const deleted = await this.documentUploadService.deleteFile(filePath);
  
  if (deleted) {
    console.log('File deleted successfully');
  } else {
    console.log('File deletion failed');
  }
}
```

## API Reference

### `uploadFile(file, metadata, ownerId)`

Uploads a file to storage with validation.

**Parameters:**
- `file` (Express.Multer.File) - The file to upload
- `metadata` (DocumentMetadata) - Document metadata
  - `docType` (string) - Type of document
  - `docSubType` (string) - Subtype of document
  - `docName` (string) - Name of document
  - `importedFrom` (string) - Source of document
- `ownerId` (string) - ID of the entity that owns this document

**Returns:** `Promise<UploadResult>`
- `filePath` (string) - Path where file was saved
- `fileExtension` (string) - File extension
- `docDatatype` (string) - Document datatype (PDF, JPEG, PNG)
- `uploadedAt` (Date) - Upload timestamp

**Throws:**
- `BadRequestException` - Invalid file type, size, or signature
- `InternalServerErrorException` - Upload failed

### `deleteFile(filePath)`

Deletes a file from storage.

**Parameters:**
- `filePath` (string) - Path to the file to delete

**Returns:** `Promise<boolean>` - True if deleted, false otherwise

### `generateDownloadUrl(filePath)`

Generates a temporary download URL (for S3) or returns the file path (for local storage).

**Parameters:**
- `filePath` (string) - Path to the file

**Returns:** `Promise<string | null>` - Download URL or file path

### `validateFileSignature(buffer, filename)`

Validates file signature using magic numbers to prevent file type spoofing.

**Parameters:**
- `buffer` (Buffer) - File buffer
- `filename` (string) - Original filename

**Throws:**
- `BadRequestException` - Invalid file signature

## Configuration

The module uses the following environment variables:

- `FILE_STORAGE_PROVIDER` - Storage provider (`local` or `s3`)
- `FILE_PREFIX_ENV` - Prefix for file paths (e.g., `dev`, `prod`)

## Example: Using in Admin Module

```typescript
// admin.module.ts
import { DocumentUploadModule } from '@modules/document-upload/document-upload.module';

@Module({
  imports: [
    // ... other imports
    DocumentUploadModule,
  ],
  // ...
})
export class AdminModule {}

// admin.service.ts
import { DocumentUploadService } from '@modules/document-upload/document-upload.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly documentUploadService: DocumentUploadService,
  ) {}

  async uploadAdminDocument(file: Express.Multer.File, adminId: string) {
    const uploadResult = await this.documentUploadService.uploadFile(
      file,
      {
        docType: 'admin-proof',
        docSubType: 'identity',
        docName: 'Admin ID Card',
        importedFrom: 'Manual Upload',
      },
      adminId,
    );

    // Save to admin_documents table
    const adminDoc = await this.adminDocRepository.save({
      admin_id: adminId,
      doc_path: uploadResult.filePath,
      doc_type: 'admin-proof',
      doc_datatype: uploadResult.docDatatype,
      uploaded_at: uploadResult.uploadedAt,
    });

    return adminDoc;
  }
}
```

## Benefits

1. **Separation of Concerns** - Upload logic is separate from business logic
2. **Reusability** - Use the same service across multiple modules
3. **Maintainability** - Changes to upload logic in one place
4. **Testability** - Easy to unit test in isolation
5. **Portability** - Copy module to another project easily
6. **Type Safety** - TypeScript interfaces for all operations

## Testing

```typescript
import { Test } from '@nestjs/testing';
import { DocumentUploadService } from './document-upload.service';

describe('DocumentUploadService', () => {
  let service: DocumentUploadService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentUploadService,
        // Mock dependencies
      ],
    }).compile();

    service = module.get<DocumentUploadService>(DocumentUploadService);
  });

  it('should upload a file', async () => {
    // Test implementation
  });
});
```

## Security Features

1. **Magic Number Validation** - Validates actual file content, not just extension
2. **File Size Limits** - Enforces maximum file size (5MB)
3. **MIME Type Validation** - Checks both extension and MIME type
4. **Automatic Cleanup** - Deletes file on upload failure
5. **Secure Storage** - Supports S3 with pre-signed URLs

## License

Internal use only - Part of Beneficiary Backend System

