# Service Adapters

## Overview

The Beneficiary Backend uses the **Adapter Pattern** to integrate with external service providers (AWS, Google, etc.) without tightly coupling the business logic. Each adapter provides a unified interface for a specific capability (file storage, text extraction, AI processing).

## What is an Adapter?

An **adapter** is a design pattern that provides a common interface to work with different external service providers. It allows you to switch providers (e.g., AWS to Google) by changing configuration rather than code.

### Key Benefits

- **Flexibility**: Switch providers via configuration
- **Maintainability**: Provider code is isolated
- **Testability**: Easy to mock for testing
- **Scalability**: Add new providers without changing business logic
- **Reusability**: Same adapters used across multiple features

## Available Adapters

The system provides three independent adapters that can be used separately or together:

### 1. OCR Processing Adapter
Extract text from images and PDFs

**Use Cases**:
- Document upload flow
- User registration with document verification
- Certificate verification
- Any text extraction from images

### 2. OCR Mapping Adapter
Convert unstructured text to structured data using AI

**Use Cases**:
- Document field extraction
- Certificate data parsing
- Form data extraction
- Any text-to-JSON transformation

### 3. Storage Adapter
Store and retrieve files from cloud storage

**Use Cases**:
- Profile picture uploads
- Document storage
- Certificate storage
- Any file storage needs

## Common Usage Patterns

### Pattern 1: Document Upload & Processing

```
Upload → OCR Processing → OCR Mapping → Storage → Database
```

**Example**: User uploads OTR certificate
- OCR extracts text
- AI maps to structured fields
- File saved to S3
- Data saved to database

**Total Time**: 5-15 seconds

---

### Pattern 2: Profile Picture Upload

```
Upload → Storage → Database
```

**Example**: User uploads profile picture
- File saved directly to S3
- URL saved to database

**Total Time**: 0.5-2 seconds

---

### Pattern 3: Registration with Document

```
Upload → OCR Processing → OCR Mapping → Validation → Storage → Database
```

**Example**: New user registers with OTR certificate
- OCR extracts text
- AI maps fields
- Validate user data
- Save file to S3
- Create user in database

**Total Time**: 6-18 seconds

---

### Pattern 4: OCR Only (No Storage)

```
Upload → OCR Processing → Return Text
```

**Example**: Quick text extraction without saving file
- Extract text from image
- Return result
- No storage needed

**Total Time**: 2-7 seconds

## Adapter Details

### 1. OCR Processing Adapter
**Purpose**: Extract text from images and PDFs

**Independent Use**: ✅ Yes - works standalone

**Current Providers**: 
- AWS Textract (high accuracy)
- Google Gemini (AI-powered)
- Tesseract (free, local)

**Configuration**: Environment variables (`OCR_PROVIDER`)

**Input**: Image/PDF buffer or file path

**Output**: Extracted text + confidence score

**Use Cases**:
- Document upload & verification
- User registration with documents
- Certificate text extraction

---

### 2. OCR Mapping Adapter
**Purpose**: Convert unstructured text to structured JSON using AI

**Independent Use**: ✅ Yes - works with any text input

**Current Providers**:
- AWS Bedrock (Claude)
- Google Gemini

**Configuration**: Environment variables (`OCR_MAPPING_PROVIDER`) + Database (vcFields)

**Input**: Raw text + field schema

**Output**: Structured JSON + validation results

**Use Cases**:
- Field extraction from documents
- Certificate data parsing
- Registration processing
- Data normalization
- Any text-to-JSON transformation

---

### 3. Storage Adapter
**Purpose**: Store and retrieve files from cloud storage

**Independent Use**: ✅ Yes - works with any file type

**Current Providers**: AWS S3

**Configuration**: Environment variables (`FILE_STORAGE_PROVIDER`)

**Input**: File buffer + metadata

**Output**: Storage URL

**Use Cases**:
- Profile picture uploads
- Document storage (certificates, IDs)
- User registration documents
- Any file storage needs
- File retrieval

## Configuration Management

### Environment Variables (Provider Selection)

Each adapter is configured independently:

```bash
# OCR Processing Adapter
OCR_PROVIDER=aws-textract          # or google-gemini, tesseract

# OCR Mapping Adapter
OCR_MAPPING_PROVIDER=bedrock       # or google-gemini

# Storage Adapter
FILE_STORAGE_PROVIDER=s3           # or gcs, azure

# Provider Credentials
AWS_S3_BUCKET_NAME=beneficiary-uploads
AWS_TEXTRACT_AWS_REGION=us-east-1
GEMINI_API_KEY=your-key
```

**Characteristics**:
- Set at deployment
- Requires restart to change
- Each adapter's provider is independent

---

### Database Configuration (Field Schemas)

OCR Mapping uses document-specific field schemas:

```json
{
  "docType": "certificate",
  "documentSubType": "otr-certificate",
  "vcFields": {
    "otr_number": { "type": "string", "required": true },
    "name": { "type": "string", "required": true }
  },
  "ocrMappingPrompt": "Optional custom AI instructions"
}
```

**Applies to**: OCR Mapping Adapter only

**Characteristics**:
- Per document type
- Can be changed anytime
- No restart needed

## How Adapters Work

### The Pattern

```
Interface → Implementation → Factory → Business Logic
```

1. **Interface**: Defines what methods adapters must have
2. **Implementation**: Adapter for specific provider (AWS, Google, etc.)
3. **Factory**: Selects which adapter to use based on config
4. **Business Logic**: Uses interface, doesn't know which provider

### Example

Instead of:
```typescript
// ❌ Tightly coupled to AWS
const textract = new AWS.Textract();
const result = await textract.process(file);
```

We use:
```typescript
// ✅ Loosely coupled to interface
const extractor = factory.create(provider); // Provider from config
const result = await extractor.extractText(file);
```

**Benefit**: Change provider in config, code stays the same.

## Adding New Providers

To add a new provider (e.g., Azure):

1. **Create adapter class** that implements the interface
2. **Register in factory** to include it in provider selection
3. **Add configuration** to environment variables
4. **Test** with real documents

Details for each adapter system are in their specific documentation.

## Why Use Adapters?

### Problem Without Adapters

If you directly use AWS/Google services in your code:

- **Tight Coupling**: Business logic tied to specific provider
- **Hard to Test**: Can't easily mock external services
- **Difficult to Switch**: Change provider = rewrite code
- **Code Duplication**: Similar logic repeated everywhere
- **Limited Reusability**: Can't reuse same service across features

### Solution With Adapters

- **Loose Coupling**: Business logic independent of provider
- **Easy Testing**: Mock the adapter interface
- **Simple Switching**: Change via configuration
- **Code Reuse**: Single adapter used across all features
- **Mix and Match**: Use adapters independently or together based on needs

## Performance

| Adapter | Time | Provider Dependent | Can Run Independently |
|---------|------|-------------------|-----------------------|
| OCR Processing | 2-7s | Yes (provider) | ✅ Yes |
| OCR Mapping | 1-3s | Yes (AI model) | ✅ Yes |
| Storage Upload | 0.5-2s | Yes (network) | ✅ Yes |

**Optimization**: 
- Profile pictures: Use Storage only (0.5-2s)
- Document verification: Use OCR + Mapping (3-10s)
- Full upload: Use all three (5-15s)
- Choose faster providers for time-sensitive operations

## Best Practices

1. **Use Environment Variables**: Don't hardcode provider names or credentials
2. **Handle Errors Gracefully**: Return user-friendly messages, log technical details
3. **Log Provider Selection**: Know which provider was used for debugging
4. **Validate Configuration**: Check required settings on startup
5. **Test with Real Providers**: Integration tests in staging environment

## Next Steps

For detailed information on each independent adapter:

- **OCR Processing Adapter** - Text extraction from images/PDFs
- **OCR Mapping Adapter** - Unstructured text to structured JSON
- **Storage Adapter** - File storage in cloud (S3, GCS, Azure)

Each adapter can be used independently or combined based on your use case.

## Summary

The adapter pattern provides:
- Clean separation between business logic and providers
- Easy provider switching via configuration
- Consistent interface across all providers
- Flexibility to add new providers

**Key Principle**: Business logic depends on interfaces, not specific provider implementations.

