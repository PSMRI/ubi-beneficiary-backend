# OCR Processing Adapter

## Overview

The OCR (Optical Character Recognition) Processing Adapter extracts text from images and PDF documents. It's an **independent service** that can be used standalone or combined with other adapters based on your needs.

## Purpose

- Extract all text content from document images and PDFs
- Support multiple file formats (JPEG, PNG, PDF)
- Provide confidence scores for extraction quality
- Work with different OCR providers for flexibility
- Operate independently without requiring other adapters

## Use Cases

This adapter is used across multiple features:

### 1. Document Upload & Verification
```
Upload → OCR Processing → OCR Mapping → Storage → Database
```
Extract text from certificates (OTR, income, caste, etc.) for field extraction

### 2. User Registration with Document
```
Registration → OCR Processing → OCR Mapping → Validation → Storage → User Creation
```
Process documents during registration flow to auto-fill user details

### 3. Quick Text Extraction (No Storage)
```
Upload → OCR Processing → Return Text
```
Extract text without saving the file (e.g., preview, validation)

### 4. Certificate Verification
```
Upload → OCR Processing → Validation → Response
```
Verify document authenticity by checking text content

## How It Works

**Input**: Image/PDF file (buffer, stream, or file path)

**Process**: Sends to OCR provider (AWS, Google, or Tesseract)

**Output**: Extracted text + confidence score

**Independence**: Works standalone - doesn't require Storage or Mapping adapters

## Current Implementations

### 1. AWS Textract
**Status**: ✅ Production Ready  
**Best For**: Production workloads, high accuracy

**Characteristics**:
- Industry-leading accuracy
- Fast processing (2-5 seconds per page)
- Handles complex documents
- Supports tables and forms
- Reliable and scalable

**When to Use**:
- Production applications
- Financial documents, certificates
- Need highest accuracy
- Already using AWS

---

### 2. Google Gemini
**Status**: ✅ Production Ready  
**Best For**: AI-powered OCR, multilingual documents

**Characteristics**:
- AI-powered with context understanding
- Excellent for multiple languages
- Fast processing (3-7 seconds)
- Good for complex layouts
- Cost-effective

**When to Use**:
- Multilingual documents
- Need AI context understanding
- Cost optimization
- Already using Google Cloud

---

### 3. Tesseract
**Status**: ✅ Production Ready  
**Best For**: Local processing, development/testing

**Characteristics**:
- Open-source (free)
- Runs locally (no API calls)
- No external costs
- Privacy-friendly
- Slower processing (5-10 seconds)

**When to Use**:
- Development and testing
- Budget constraints
- Privacy-sensitive documents
- Offline processing needed

---

## Configuration

### Environment Variables

```bash
# Choose one provider
OCR_PROVIDER=aws-textract
# OR
OCR_PROVIDER=google-gemini
# OR
OCR_PROVIDER=tesseract
```

### AWS Textract Configuration

```bash
OCR_PROVIDER=aws-textract
AWS_TEXTRACT_AWS_REGION=us-east-1
AWS_TEXTRACT_ACCESS_KEY_ID=your-access-key
AWS_TEXTRACT_SECRET_ACCESS_KEY=your-secret-key
```

### Google Gemini Configuration

```bash
OCR_PROVIDER=google-gemini
GEMINI_API_KEY=your-gemini-api-key
```

### Tesseract Configuration

```bash
OCR_PROVIDER=tesseract
# No additional configuration needed
```

## How It Works

### The Interface

All OCR adapters implement a common interface:

**Key Operations**:
- `extractText()` - Extract text from document
- `supportsFileType()` - Check if file type is supported
- `getProviderName()` - Return provider name
- `validatePermissions()` - Check API access

### Provider Selection

The system selects the OCR provider based on `OCR_PROVIDER` environment variable:

- `aws-textract` → AWS Textract Adapter
- `google-gemini` → Google Gemini Adapter
- `tesseract` → Tesseract Adapter

### Supported File Types

| File Type | AWS Textract | Google Gemini | Tesseract |
|-----------|--------------|---------------|-----------|
| JPEG | ✅ | ✅ | ✅ |
| PNG | ✅ | ✅ | ✅ |
| PDF | ✅ | ✅ | ❌ |
| BMP | ❌ | ❌ | ✅ |
| TIFF | ❌ | ❌ | ✅ |
| WebP | ❌ | ✅ | ❌ |

## Output

### Extracted Text Object

```json
{
  "fullText": "CERTIFICATE\nName: John Doe\nID: 123456...",
  "confidence": 95,
  "metadata": {
    "pageCount": 1,
    "language": "en",
    "processingTime": 2500
  }
}
```

**Fields**:
- `fullText`: Complete extracted text
- `confidence`: Quality score (0-100, higher is better)
- `metadata`: Additional information about processing

## Adding a New OCR Provider

To add support for Azure Computer Vision or other providers:

### 1. Create New Adapter Class

Implement the OCR interface for the new provider.

**Location**: `src/services/ocr/adapters/extractors/`

### 2. Register in Factory

Add the provider to factory selection logic.

**File**: `src/services/ocr/factories/text-extractor.factory.ts`

### 3. Configure Environment

Add required environment variables.

### 4. Test

Test with various document types and verify accuracy.

## Provider Comparison

| Feature | AWS Textract | Google Gemini | Tesseract |
|---------|--------------|---------------|-----------|
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Speed** | Fast (2-5s) | Medium (3-7s) | Slow (5-10s) |
| **Cost** | $$ | $ | Free |
| **Multilingual** | Good | Excellent | Good |
| **Setup** | AWS Account | API Key | Local Install |
| **Offline** | ❌ | ❌ | ✅ |

### Choosing the Right Provider

**Use AWS Textract if**:
- Need highest accuracy
- Processing official documents
- Budget allows for API costs
- Already using AWS

**Use Google Gemini if**:
- Processing multilingual documents
- Need good accuracy at lower cost
- Want AI-powered understanding
- Already using Google Cloud

**Use Tesseract if**:
- Development and testing
- No budget for API costs
- Privacy concerns (keep data local)
- Offline processing required

## Performance

### Processing Time

| Document Type | AWS Textract | Google Gemini | Tesseract |
|---------------|--------------|---------------|-----------|
| Single page | 2-3s | 3-5s | 5-7s |
| Multi-page (5) | 8-12s | 12-18s | 25-35s |
| Complex layout | 3-5s | 5-8s | 8-12s |

**Factors Affecting Speed**:
- Document complexity
- File size and quality
- Network latency (cloud providers)
- Server resources (Tesseract)

### Quality Factors

**What improves OCR accuracy**:
- High-resolution images (300+ DPI)
- Good contrast and lighting
- Clear, printed text (not handwritten)
- Straight, non-skewed documents
- Clean backgrounds

**What reduces OCR accuracy**:
- Low-resolution images
- Blurry or out-of-focus
- Handwritten text
- Complex backgrounds
- Skewed or rotated images

## Improving OCR Quality

### 1. Switch Providers

If accuracy is low, try a different provider:
```bash
# Change from Tesseract to AWS Textract
OCR_PROVIDER=aws-textract
```

### 2. Image Preprocessing

Preprocess images before OCR:
- Convert to grayscale
- Enhance contrast
- Sharpen text
- Remove noise

### 3. Request Better Quality

Ask users to upload:
- Higher resolution images
- Well-lit, clear photos
- Straight (not skewed) documents

## Troubleshooting

### Issue: Low Confidence Scores

**Symptoms**: Confidence < 60%

**Causes**:
- Poor image quality
- Blurry or low-resolution
- Handwritten text
- Complex backgrounds

**Solutions**:
1. Try different OCR provider
2. Request user to re-upload better quality image
3. Apply image preprocessing
4. Use Google Gemini for better context understanding

### Issue: Missing or Incorrect Text

**Symptoms**: Some text not extracted or wrong

**Causes**:
- Unusual fonts
- Very small text
- Text on colored/patterned backgrounds
- Skewed or rotated document

**Solutions**:
1. Use Google Gemini (better with context)
2. Preprocess image (rotate, enhance)
3. Request clearer document upload

### Issue: Slow Processing

**Symptoms**: Takes > 15 seconds

**Causes**:
- Large file size
- Multiple pages
- Network latency
- Provider API slowness

**Solutions**:
1. Switch to faster provider (Gemini often faster than AWS)
2. Resize images before processing
3. Process pages in parallel
4. Use regional endpoints

### Issue: "Provider Not Supported" Error

**Cause**: Wrong provider name in configuration

**Solution**: Check `OCR_PROVIDER` value matches exactly:
- `aws-textract` (not `textract` or `aws`)
- `google-gemini` (not `gemini` or `google`)
- `tesseract` (not `tesseract-ocr`)

## Security Considerations

### 1. Validate File Types

Only allow supported document types to prevent abuse.

### 2. Limit File Size

Set maximum file size (e.g., 10MB) to prevent resource exhaustion.

### 3. Sanitize Extracted Text

Clean extracted text before storing:
- Remove control characters
- Trim whitespace
- Validate encoding

### 4. Secure Credentials

Store API keys and credentials in environment variables, never in code.

## Best Practices

1. **Check File Type Support**: Verify provider supports the file type before processing
2. **Handle Errors Gracefully**: Return user-friendly messages on failure
3. **Log Provider and Performance**: Track which provider was used and how long it took
4. **Validate Extracted Text**: Check that text was actually extracted
5. **Implement Retry Logic**: Retry failed extractions (with exponential backoff)

## Summary

The OCR Processing Adapter:
- **Independent service** - works standalone or with other adapters
- Extracts text from images and PDFs
- Supports three providers (AWS, Google, Tesseract)
- Configured via environment variables
- Returns text with confidence score
- Used across multiple features: document upload, registration, verification

**Common Integrations**:
- Standalone: Text extraction only
- With OCR Mapping: Add structured data extraction
- With Storage: Save documents after processing
- All three: Complete document processing pipeline

---

**Related Documentation**:
- **Service Adapters** - How adapters work together
- **OCR Mapping Adapter** - Structure extracted text
- **Storage Adapter** - Store files in cloud

