# Storage Providers Module

This module provides a flexible file storage abstraction that supports multiple storage backends. Currently implemented adapters: **Local Storage** and **AWS S3**.

## Architecture

The module uses a factory pattern to instantiate the appropriate storage adapter based on environment configuration:

```
StorageProviderModule
├── IFileStorageService (Interface)
├── LocalStorageAdapter (Implementation)
└── S3StorageAdapter (Implementation)
```

## Features

- **Pluggable Architecture**: Easy to add new storage providers
- **Environment-based Configuration**: Switch storage providers via environment variables
- **Consistent API**: All adapters implement the same interface
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Full TypeScript support

## Storage Adapters

### Local Storage Adapter

Stores files on the local filesystem in the `uploads/` directory.

**Features:**
- Creates directories automatically
- Path traversal protection
- Supports file deletion
- Relative path management

**Use Cases:**
- Local development
- Testing
- Small-scale deployments
- When S3 is not required

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
- `isPublic`: (Optional) Whether the file should be publicly accessible (S3 only)

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

#### `moveFile(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>` (S3 only)

Moves a file from one location to another.

**Parameters:**
- `fromKey`: Source file path/key
- `toKey`: Destination file path/key
- `isPublic`: (Optional) Whether the destination file should be publicly accessible

**Returns:** `true` if moved successfully, `false` otherwise

#### `copyFile(fromKey: string, toKey: string, isPublic?: boolean): Promise<boolean>` (S3 only)

Copies a file to another location.

**Parameters:**
- `fromKey`: Source file path/key
- `toKey`: Destination file path/key
- `isPublic`: (Optional) Whether the destination file should be publicly accessible

**Returns:** `true` if copied successfully, `false` otherwise

#### `generateTemporaryUrl(key: string, expiresAt?: Date): Promise<string | null>` (S3 only)

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

**Common:**
```env
FILE_STORAGE_PROVIDER=local  # or 's3'
FILE_PREFIX_ENV=local        # or 'dev', 'prod', etc.
```

**S3-specific:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET_NAME=your-bucket
AWS_PREFIX=documents/        # Optional
```

See [STORAGE_CONFIGURATION.md](../../../docs/STORAGE_CONFIGURATION.md) for detailed configuration guide.

## Error Handling

All adapters implement comprehensive error handling:

**Local Storage:**
- File system errors (permissions, disk full, etc.)
- Path traversal attempts
- File not found errors

**S3 Storage:**
- Network errors
- Authentication errors
- Bucket access errors
- Rate limiting

Errors are logged using NestJS Logger and returned as `null` or `false` to allow graceful degradation.

## Adding a New Storage Adapter

To add a new storage adapter:

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

2. Update the `StorageProviderModule` factory:

```typescript
if (provider === 'azure') {
  return new AzureBlobStorageAdapter();
}
```

3. Document the new adapter and its configuration requirements

## Testing

### Unit Tests

Test your adapter implementation:

```typescript
describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  it('should upload a file', async () => {
    const content = Buffer.from('test content');
    const path = await adapter.uploadFile('test.txt', content);
    expect(path).toBeTruthy();
  });
});
```

### Integration Tests

Test with actual storage backends (use test buckets/directories):

```typescript
describe('Upload Integration', () => {
  it('should upload to configured storage', async () => {
    // Test implementation
  });
});
```

## Performance Considerations

### Local Storage
- **Fast**: Direct filesystem access
- **Limited**: Bound by local disk I/O
- **Scalability**: Not suitable for multi-server deployments

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

## Security Considerations

1. **Private by Default**: Files are private unless explicitly made public
2. **Path Traversal Protection**: Local storage validates paths
3. **AWS Credentials**: Never commit credentials; use IAM roles when possible
4. **Bucket Policies**: Restrict bucket access appropriately
5. **Encryption**: Enable S3 encryption at rest
6. **HTTPS**: Always use HTTPS for S3 requests

## Dependencies

- `@aws-sdk/client-s3`: AWS SDK for S3 operations
- `@flystorage/file-storage`: File storage abstraction library
- `@flystorage/aws-s3`: Flystorage S3 adapter
- `@nestjs/config`: Configuration management
- `@nestjs/common`: NestJS common utilities

## Troubleshooting

### Local Storage Issues

**Problem**: Files not saved
**Solution**: Check directory permissions, disk space

**Problem**: Path traversal detected
**Solution**: Ensure file keys don't contain `..`

### S3 Storage Issues

**Problem**: Access Denied
**Solution**: Verify IAM permissions and bucket policy

**Problem**: Slow uploads
**Solution**: Check network, consider enabling S3 Transfer Acceleration

**Problem**: Bucket not found
**Solution**: Verify bucket name and region

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Flystorage Documentation](https://github.com/duna-oss/flystorage)
- [NestJS Modules](https://docs.nestjs.com/modules)

