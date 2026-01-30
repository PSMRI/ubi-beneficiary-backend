# Storage Adapter

## Overview

The Storage Adapter provides a unified way to store and retrieve files from cloud storage providers. It's an **independent service** that handles any file type without requiring OCR or other processing.

## Purpose

- Store any file type securely in cloud storage
- Retrieve files when needed
- Generate URLs for file access
- Support different storage providers without code changes
- Work independently of other adapters

## Use Cases

This adapter is used across multiple features:

### 1. Profile Picture Uploads
```
Upload → Storage → Database (URL)
```
Store user profile pictures directly - no OCR needed

### 2. Document Storage After Processing
```
Upload → OCR → Mapping → Storage → Database
```
Save documents after successful text extraction and validation

### 3. Registration Document Upload
```
Registration → OCR → Mapping → Storage → User Creation
```
Store documents uploaded during registration flow

### 4. Direct File Upload (No Processing)
```
Upload → Storage → Database
```
Save any file without OCR or processing (attachments, images, PDFs)

### 5. File Retrieval
```
Request → Storage (retrieve by key) → Download
```
Fetch previously uploaded files for display or download

## How It Works

**Input**: File buffer + metadata (user ID, file type, privacy settings)

**Process**: Upload to cloud storage provider (S3, GCS, Azure)

**Output**: Storage URL + file key

**Independence**: Works standalone - doesn't require OCR or Mapping adapters

## Current Implementation

### AWS S3

**Provider**: Amazon Web Services S3  
**Status**: ✅ Production Ready

**Why S3**:
- Highly reliable and durable
- Scalable (handles any number of files)
- Industry standard
- Cost-effective for document storage

## Configuration

### Environment Variables

```bash
FILE_STORAGE_PROVIDER=s3
AWS_S3_REGION=us-east-1
AWS_S3_ACCESS_KEY_ID=your-access-key-id
AWS_S3_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=beneficiary-uploads
```

### File Organization

Files are stored with this structure:
```
uploads/{userId}/{timestamp}_{originalFilename}
```

**Example**:
```
uploads/user123/1704012345678_otr-certificate.pdf
```

This ensures:
- Files are organized by user
- Unique filenames (no overwrites)
- Easy to locate and manage

## How It Works

### The Interface

The adapter implements a common interface that all storage providers must follow:

**Key Operations**:
- `uploadFile()` - Save file to storage
- `getFile()` - Retrieve file from storage
- `deleteFile()` - Remove file (optional)
- `generateTemporaryUrl()` - Create signed URL with expiration (optional)

### Provider Selection

The system automatically selects the storage provider based on the `FILE_STORAGE_PROVIDER` environment variable:

- If `s3` → Use AWS S3 Adapter
- If `gcs` → Use Google Cloud Storage Adapter
- If `azure` → Use Azure Blob Storage Adapter

**Business logic doesn't know or care which provider is used.**

## Adding a New Storage Provider

To add support for Google Cloud Storage or Azure:

### 1. Create New Adapter Class

Implement the storage interface for the new provider.

**Location**: `src/services/storage-providers/adapters/`

### 2. Register in Module

Add the new provider to the selection logic.

**File**: `src/services/storage-providers/storage-provider.module.ts`

### 3. Configure Environment

Add required environment variables for the new provider.

### 4. Test

Test upload, download, and deletion operations.

**Details**: See [How It Works](#how-it-works) section for interface requirements.

## Provider Comparison

| Feature | AWS S3 | Google Cloud Storage | Azure Blob Storage |
|---------|--------|---------------------|-------------------|
| **Reliability** | Excellent | Excellent | Excellent |
| **Cost** | $$ | $$ | $$ |
| **Setup** | AWS Account | GCP Account | Azure Account |
| **Global** | Yes | Yes | Yes |
| **Current Status** | ✅ Implemented | ⚠️ Not Implemented | ⚠️ Not Implemented |

### When to Use Each

**AWS S3**:
- Already using AWS infrastructure
- Need highest reliability
- Standard for most applications

**Google Cloud Storage**:
- Already using Google Cloud
- Want GCP ecosystem integration
- Specific GCP features needed

**Azure Blob Storage**:
- Already using Azure infrastructure
- Microsoft ecosystem preference
- Specific Azure features needed

## Common Operations

### Upload File

**Input**: File buffer, storage key, privacy setting  
**Output**: Storage URL  
**Time**: 0.5-2 seconds (depends on file size and network)

### Retrieve File

**Input**: Storage key  
**Output**: File buffer  
**Time**: 0.3-1 second

### Generate Temporary URL

**Input**: Storage key, expiration time  
**Output**: Signed URL (expires after set time)  
**Use Case**: Secure document sharing

## Security Considerations

### 1. Files are Private by Default

Documents are stored with private access. Only authenticated users can access them.

### 2. Signed URLs for Sharing

When documents need to be shared, temporary signed URLs are generated that expire after a set time.

### 3. Access Control

Storage buckets are configured with strict IAM policies:
- Only application can upload files
- Only authenticated users can download
- No public access

### 4. File Name Sanitization

Original filenames are sanitized to prevent security issues:
- Remove special characters
- Add timestamp to prevent overwrites
- Organize by user ID

## Performance

### Upload Performance

| File Size | Time | Notes |
|-----------|------|-------|
| < 1MB | 0.5-1s | Most documents |
| 1-5MB | 1-2s | Larger documents |
| > 5MB | 2-5s | Very large files |

**Factors Affecting Speed**:
- File size
- Network speed
- Distance to storage region
- Storage provider performance

### Optimization Tips

1. **Choose Nearest Region**: Select storage region close to your servers
2. **Compress Images**: Reduce file size before upload (if acceptable)
3. **Use Multipart Upload**: For files larger than 5MB
4. **Monitor Performance**: Track upload times and optimize as needed

## Troubleshooting

### Issue: "Access Denied" Error

**Cause**: Incorrect credentials or IAM permissions

**Solution**:
- Verify environment variables are correct
- Check IAM user/role has required permissions
- Ensure bucket name is correct

### Issue: Slow Uploads

**Cause**: Network issues or large file size

**Solution**:
- Check network connection
- Verify server region is close to storage region
- Consider multipart upload for large files

### Issue: "Bucket Not Found"

**Cause**: Bucket doesn't exist or name is incorrect

**Solution**:
- Verify `AWS_S3_BUCKET_NAME` matches actual bucket
- Ensure bucket exists in specified region

## Best Practices

1. **Use Environment Variables**: Never hardcode credentials
2. **Organized File Structure**: Use consistent key naming (userId/timestamp/filename)
3. **Handle Errors Gracefully**: Return null on failure, log errors
4. **Private by Default**: Only make files public when necessary
5. **Monitor Storage Costs**: Track usage and optimize as needed

## Summary

The Storage Adapter:
- **Independent service** - works with any file type
- Stores files in cloud storage (currently S3)
- Provides unified interface for any storage provider
- Configured via environment variables
- Easy to switch or add providers
- Used across multiple features: profile pictures, documents, attachments

**Common Integrations**:
- Standalone: Direct file uploads (profile pictures, attachments)
- After OCR Processing: Store documents after text extraction
- After OCR Mapping: Store documents after validation succeeds
- All three: Complete document processing and storage

**When to Use**:
- ✅ Profile pictures → Storage only
- ✅ Attachments → Storage only
- ✅ Documents with OCR → OCR + Mapping + Storage
- ✅ Registration docs → OCR + Mapping + Storage + User creation

---

**Related Documentation**:
- **Service Adapters** - How adapters work together
- **OCR Processing Adapter** - Extract text from images
- **OCR Mapping Adapter** - Structure extracted text

