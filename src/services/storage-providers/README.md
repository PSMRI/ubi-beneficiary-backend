# Storage Providers Module

This module provides a file storage abstraction using AWS S3 as the storage backend.

## Architecture

The module uses S3 storage adapter implementing the IFileStorageService interface:

```
StorageProviderModule
├── IFileStorageService (Interface)
└── S3StorageAdapter (Implementation)
```

## Features

- **S3 Integration**: Built on AWS SDK v3 with Flystorage library
- **Consistent API**: Clean interface for file operations
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Full TypeScript support
- **Security**: Private file storage by default with temporary URL generation

## Storage Adapter

### S3 Storage Adapter

Stores files in AWS S3 buckets using the Flystorage library.

**Features:**
- Private file storage by default
- Configurable bucket and region
- Support for file operations (upload, download, delete, move, copy)
- Temporary URL generation
- Built on AWS SDK v3

**Use Cases:**
- Production deployments
- Scalable storage requirements
- Multi-region deployments
- High availability requirements

## Interface Definition

```typescript
export interface IFileStorageService {
  uploadFile(key: string, content: Buffer, isPublic?: boolean): Promise<string | null>;
  getFile(key: string): Promise<Buffer | null>;
  deleteFile?(key: string): Promise<boolean>;
  moveFile?(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>;
  copyFile?(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>;
  generateTemporaryUrl?(key: string, expiresAt?: Date): Promise<string | null>;
}
```

### Methods

#### `uploadFile(key: string, content: Buffer, isPublic?: boolean): Promise<string | null>`

Uploads a file to storage.

**Parameters:**
- `key`: Unique identifier/path for the file
- `content`: File content as Buffer
- `isPublic`: (Optional) Whether the file should be publicly accessible

**Returns:** File path/key on success, `null` on failure

**Example:**
```typescript
const path = await fileStorageService.uploadFile(
  'user-123/document.pdf',
  fileBuffer
);
```

#### `getFile(key: string): Promise<Buffer | null>`

Retrieves a file from storage.

**Parameters:**
- `key`: File path/key

**Returns:** File content as Buffer, `null` if not found

**Example:**
```typescript
const fileContent = await fileStorageService.getFile('user-123/document.pdf');
```

#### `deleteFile(key: string): Promise<boolean>`

Deletes a file from storage.

**Parameters:**
- `key`: File path/key

**Returns:** `true` if deleted successfully, `false` otherwise

**Example:**
```typescript
const deleted = await fileStorageService.deleteFile('user-123/document.pdf');
```

#### `moveFile(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>`

Moves a file from one location to another.

**Parameters:**
- `fromKey`: Source file path/key
- `toKey`: Destination file path/key
- `isPublic`: (Optional) Whether the destination file should be publicly accessible

**Returns:** `true` if moved successfully, `false` otherwise

#### `copyFile(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>`

Copies a file to another location.

**Parameters:**
- `fromKey`: Source file path/key
- `toKey`: Destination file path/key
- `isPublic`: (Optional) Whether the destination file should be publicly accessible

**Returns:** `true` if copied successfully, `false` otherwise

#### `generateTemporaryUrl(key: string, expiresAt?: Date): Promise<string | null>`

Generates a temporary pre-signed URL for file access.

**Parameters:**
- `key`: File path/key
- `expiresAt`: (Optional) Expiration date (default: 20 minutes from now)

**Returns:** Pre-signed URL on success, `null` on failure

**Example:**
```typescript
const url = await fileStorageService.generateTemporaryUrl(
  'user-123/document.pdf',
  new Date(Date.now() + 3600000) // 1 hour from now
);
```

## Usage

### Module Import

Import the `StorageProviderModule` in your feature module:

```typescript
import { StorageProviderModule } from '@services/storage-providers/storage-provider.module';

@Module({
  imports: [StorageProviderModule],
  // ...
})
export class YourModule {}
```

### Service Injection

Inject the `FileStorageService` in your service:

```typescript
import { IFileStorageService } from '@services/storage-providers/file-storage.service.interface';

@Injectable()
export class YourService {
  constructor(
    @Inject('FileStorageService')
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async uploadDocument(file: Express.Multer.File) {
    const fileKey = `documents/${file.originalname}`;
    const uploadedPath = await this.fileStorageService.uploadFile(
      fileKey,
      file.buffer
    );
    return uploadedPath;
  }
}
```

## Configuration

### Environment Variables

**S3 Configuration:**
```env
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your_key
AWS_S3_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET_NAME=your-bucket
AWS_S3_PREFIX=documents/        # Optional
FILE_PREFIX_ENV=dev          # or 'prod', 'staging', etc.
```

See [STORAGE_CONFIGURATION.md](../../../docs/STORAGE_CONFIGURATION.md) for detailed configuration guide.

## Error Handling

The S3 adapter implements comprehensive error handling:

**S3 Storage:**
- Network errors
- Authentication errors
- Bucket access errors
- Rate limiting

Errors are logged using NestJS Logger and returned as `null` or `false` to allow graceful degradation.

## Extending the Storage Module

To add additional storage adapters or extend functionality:

1. Create a new adapter class implementing `IFileStorageService`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IFileStorageService } from '../file-storage.service.interface';

@Injectable()
export class AzureBlobStorageAdapter implements IFileStorageService {
  private readonly logger = new Logger(AzureBlobStorageAdapter.name);

  async uploadFile(key: string, content: Buffer): Promise<string | null> {
    // Implementation
  }

  async getFile(key: string): Promise<Buffer | null> {
    // Implementation
  }

  async deleteFile(key: string): Promise<boolean> {
    // Implementation
  }
}
```

2. Update the `StorageProviderModule` to support the new adapter

3. Document the new adapter and its configuration requirements

## Testing

### Unit Tests

Test the S3 adapter implementation:

```typescript
describe('S3StorageAdapter', () => {
  let adapter: S3StorageAdapter;

  beforeEach(() => {
    adapter = new S3StorageAdapter();
  });

  it('should upload a file', async () => {
    const content = Buffer.from('test content');
    const path = await adapter.uploadFile('test.txt', content);
    expect(path).toBeTruthy();
  });
});
```

### Integration Tests

Test with actual S3 storage (use test buckets):

```typescript
describe('S3 Upload Integration', () => {
  it('should upload to S3 bucket', async () => {
    // Test implementation with actual S3 service
  });
});
```

## Performance Considerations

### S3 Storage
- **Network Latency**: Depends on network conditions and AWS region
- **Scalable**: Handles high throughput
- **Cost**: Pay per request and storage

### Optimization Tips

1. **Use appropriate file keys**: Organize files logically
2. **Enable S3 Transfer Acceleration**: For faster uploads (additional cost)
3. **Use S3 Multipart Upload**: For large files (>100MB)
4. **Implement caching**: Cache frequently accessed files
5. **Use CDN**: For public files, use CloudFront or similar
6. **Choose appropriate region**: Select region closest to your users

## Security Considerations

1. **Private by Default**: Files are private unless explicitly made public
2. **AWS Credentials**: Never commit credentials; use IAM roles when possible
3. **Bucket Policies**: Restrict bucket access appropriately
4. **Encryption**: Enable S3 encryption at rest
5. **HTTPS**: Always use HTTPS for S3 requests
6. **Access Control**: Use appropriate IAM policies and S3 bucket policies

## Dependencies

- `@aws-sdk/client-s3`: AWS SDK for S3 operations
- `@flystorage/file-storage`: File storage abstraction library
- `@flystorage/aws-s3`: Flystorage S3 adapter
- `@nestjs/config`: Configuration management
- `@nestjs/common`: NestJS common utilities

## Troubleshooting

### S3 Storage Issues

**Problem**: Access Denied
**Solution**: Verify IAM permissions and bucket policy

**Problem**: Slow uploads
**Solution**: Check network, consider enabling S3 Transfer Acceleration

**Problem**: Bucket not found
**Solution**: Verify bucket name and region

**Problem**: Authentication errors
**Solution**: Verify AWS credentials and region configuration

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Flystorage Documentation](https://github.com/duna-oss/flystorage)
- [NestJS Modules](https://docs.nestjs.com/modules)



