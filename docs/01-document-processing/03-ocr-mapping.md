# OCR Mapping Adapter

## Overview

The OCR Mapping Adapter uses AI to transform unstructured text into structured JSON data. It's an **independent service** that can process any text input, not just OCR output.

## Purpose

- Convert unstructured text into structured field data
- Extract specific fields using AI intelligence
- Validate data against business rules
- Provide confidence scores and error reports
- Support custom AI prompts per document type
- Work with any text source (OCR, manual input, API data)

## Use Cases

This adapter is used across multiple features:

### 1. Document Field Extraction
```
OCR Text → OCR Mapping → Structured Fields → Database
```
Extract specific fields from document text (name, ID, date, etc.)

### 2. Registration Form Processing
```
Registration → OCR Processing → OCR Mapping → Auto-fill Form → User Creation
```
Auto-fill registration form fields from uploaded documents

### 3. Certificate Data Parsing
```
Certificate Upload → OCR Processing → OCR Mapping → Validation → Storage
```
Parse and validate certificate data during verification

### 4. Manual Text to JSON
```
Text Input → OCR Mapping → Structured Data
```
Convert any text to structured JSON (not just from OCR)

### 5. Data Normalization
```
Raw Data → OCR Mapping → Formatted & Validated Data
```
Standardize and validate data from various sources

## How It Works

**Input**: Raw text (from OCR or any source) + field schema

**Process**: AI analyzes text and extracts fields per schema

**Output**: Structured JSON + validation results + confidence

**Independence**: Works with any text - doesn't require OCR or Storage adapters

## Why It's Needed

### The Problem

After OCR, you have unstructured text:
```
OTR CERTIFICATE
Name: John Doe
Father's Name: Robert Doe
OTR Number: 223-414-178-889-127
Date of Birth: 15/01/1990
```

### The Solution

Application needs structured data:
```json
{
  "name": "John Doe",
  "father_name": "Robert Doe",
  "otr_number": "223414178889127",
  "date_of_birth": "1990-01-15"
}
```

**OCR Mapping bridges this gap using AI.**

## Current Implementations

### 1. AWS Bedrock (Claude)
**Status**: ✅ Production Ready  
**Best For**: Highest accuracy, complex documents

**Characteristics**:
- Uses Claude 3 Sonnet model
- Excellent at structured data extraction
- Understands context and business rules
- High accuracy and reliability
- Processing time: 1-3 seconds

**When to Use**:
- Production applications
- Complex documents with many fields
- Need highest accuracy
- Already using AWS infrastructure

---

### 2. Google Gemini
**Status**: ✅ Production Ready  
**Best For**: Fast processing, cost-effective

**Characteristics**:
- Uses Gemini 1.5 Pro model
- Fast response times
- Good accuracy
- Cost-effective alternative
- Processing time: 1-2 seconds

**When to Use**:
- Fast processing required
- Cost-sensitive applications
- Good balance of speed and accuracy
- Already using Google Cloud

---

## Configuration

### Environment Variables

```bash
# Choose AI provider
OCR_MAPPING_PROVIDER=bedrock
# OR
OCR_MAPPING_PROVIDER=google-gemini
```

### AWS Bedrock Configuration

```bash
OCR_MAPPING_PROVIDER=bedrock
AWS_BEDROCK_AWS_REGION=us-east-1
AWS_BEDROCK_ACCESS_KEY_ID=your-access-key
AWS_BEDROCK_SECRET_ACCESS_KEY=your-secret-key
AWS_BEDROCK_CLAUDE_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Google Gemini Configuration

```bash
OCR_MAPPING_PROVIDER=google-gemini
GEMINI_API_KEY=your-gemini-api-key
```

### Database Configuration (vcConfiguration)

Each document type has its own field schema and optional custom AI prompt:

```json
{
  "docType": "certificate",
  "documentSubType": "otr-certificate",
  "vcFields": {
    "otr_number": {
      "type": "string",
      "required": true,
      "pattern": "^[0-9]{15}$"
    },
    "name": {
      "type": "string",
      "required": true,
      "minLength": 2
    }
  },
  "ocrMappingPrompt": "Custom instructions for AI (optional)"
}
```

## How It Works

### The Process

1. **Schema Generation**: Convert vcFields to JSON schema
2. **Fetch Custom Prompt**: Get document-specific prompt (if exists)
3. **AI Processing**: Send text + schema + prompt to AI
4. **Validation**: Check types, patterns, lengths, enums
5. **Normalization**: Format dates, convert types, clean data
6. **Return Results**: Structured data + errors + confidence

### Field Configuration (vcFields)

Each field can have:

| Property | Purpose | Example |
|----------|---------|---------|
| `type` | Data type | `string`, `number`, `boolean`, `date` |
| `required` | Is mandatory | `true` / `false` |
| `pattern` | Regex validation | `^[0-9]{15}$` |
| `minLength` | Min string length | `2` |
| `maxLength` | Max string length | `100` |
| `enum` | Allowed values | `["male", "female", "other"]` |
| `description` | Field description for AI | `"15-digit OTR Number"` |

### Custom AI Prompts

You can add custom prompts per document type to improve accuracy:

**When to Use**:
- Default extraction has low accuracy
- Document has specific formatting
- Field names differ from actual labels
- Complex business rules to apply
- Need to handle edge cases

**Example**:
```json
{
  "ocrMappingPrompt": "The OTR number is 15 digits. Remove hyphens if present. Convert dates to YYYY-MM-DD format."
}
```

## Output

### Success Response

```json
{
  "mapped_data": {
    "otr_number": "223414178889127",
    "name": "John Doe",
    "date_of_birth": "1990-01-15"
  },
  "confidence": 0.95,
  "missing_fields": [],
  "validationErrors": [],
  "isValidDocument": true
}
```

### With Validation Errors

```json
{
  "mapped_data": {
    "name": "John Doe"
  },
  "confidence": 0.50,
  "missing_fields": ["otr_number"],
  "validationErrors": [
    {
      "field": "otr_number",
      "error": "OTR Number must be exactly 15 digits",
      "constraint": "pattern"
    }
  ],
  "isValidDocument": true
}
```

## Validation Features

### 1. Type Conversion

Automatically converts extracted values to correct types:
- String → Number (removes commas, symbols)
- String → Date (standardizes format)
- String → Boolean (`yes` → `true`)

### 2. Pattern Validation

Validates data against regex patterns:
- Phone numbers: `^[0-9]{10}$`
- OTR numbers: `^[0-9]{15}$`
- Dates: Various formats

### 3. Length Validation

Checks min/max length for strings:
- Name must be 2-100 characters
- Address must be 10-500 characters

### 4. Enum Validation

Ensures value is from allowed list:
- Gender: `["male", "female", "other"]`
- State: `["jharkhand", "odisha", ...]`

### 5. Localized Error Messages

Supports multiple languages (English, Hindi):
```json
{
  "en": { "required": "OTR Number is required" },
  "hi": { "required": "OTR नंबर आवश्यक है" }
}
```

## Adding a New AI Provider

To add support for OpenAI GPT-4 or other providers:

### 1. Create New Adapter Class

Implement the AI mapping interface for the new provider.

**Location**: `src/services/ocr-mapping/adapters/`

### 2. Register in Service

Add the provider to service initialization.

**File**: `src/services/ocr-mapping/ocr-mapping.service.ts`

### 3. Configure Environment

Add required API keys and configuration.

### 4. Test

Test with various document types and verify accuracy.

## Provider Comparison

| Feature | AWS Bedrock (Claude) | Google Gemini |
|---------|---------------------|---------------|
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | Fast (1-3s) | Very Fast (1-2s) |
| **Cost** | $$ | $ |
| **Context Window** | 200K tokens | 1M tokens |
| **JSON Mode** | ✅ | ✅ |
| **Setup** | AWS Account | API Key |

### Choosing the Right Provider

**Use AWS Bedrock if**:
- Need highest accuracy
- Processing complex documents
- Many fields to extract
- Already using AWS

**Use Google Gemini if**:
- Speed is priority
- Cost optimization needed
- Very long documents (1M context)
- Already using Google Cloud

## Improving Mapping Accuracy

### 1. Add Custom Prompts

Provide specific instructions for your document type:
```json
{
  "ocrMappingPrompt": "Detailed instructions about field locations, formats, and edge cases"
}
```

### 2. Improve OCR Quality

Better OCR text = better mapping:
- Switch to better OCR provider
- Use higher resolution images
- Preprocess images

### 3. Better Field Descriptions

Help AI understand what to extract:
```json
{
  "otr_number": {
    "description": "15-digit OTR Number without hyphens or spaces"
  }
}
```

### 4. Switch AI Provider

Try the other provider if accuracy is low.

## Troubleshooting

### Issue: Low Confidence Scores

**Symptoms**: Confidence < 0.6

**Causes**:
- Poor OCR text quality
- Generic AI prompts
- Missing field descriptions
- Complex document layout

**Solutions**:
1. Add custom `ocrMappingPrompt`
2. Improve OCR provider (use AWS Textract)
3. Add better field descriptions in vcFields
4. Try different AI provider

### Issue: Wrong Data Types

**Symptoms**: Numbers as strings, wrong date format

**Cause**: AI returns incorrect type

**Solution**: Validation automatically converts types. Ensure `type` is specified in vcFields.

### Issue: Document Type Mismatch

**Symptoms**: `isValidDocument: false`

**Cause**: Wrong document uploaded (e.g., Income Certificate instead of OTR)

**Solution**: Check `isValidDocument` and reject with user-friendly message.

### Issue: Missing Required Fields

**Symptoms**: Required fields in `missing_fields` array

**Causes**:
- Field not visible in document
- AI couldn't locate field
- OCR didn't extract that section

**Solutions**:
1. Check if field actually exists in document
2. Add custom prompt with field location hints
3. Improve OCR quality
4. Request user to upload clearer document

## Performance

### Processing Time

| Document Complexity | AWS Bedrock | Google Gemini |
|-------------------|-------------|---------------|
| Simple (5 fields) | 1-2s | 1s |
| Medium (10 fields) | 2-3s | 1-2s |
| Complex (20+ fields) | 3-4s | 2-3s |

**Optimization Tips**:
- Cache field schemas (don't rebuild every time)
- Process multiple documents in parallel
- Use timeout handling for long requests

## Security Considerations

### 1. Validate AI Response

Never trust AI output directly:
- Check response is valid JSON
- Validate against schema
- Apply business rule checks

### 2. Sanitize Extracted Data

Clean data before storing:
- Remove control characters
- Trim whitespace
- Validate encoding

### 3. Rate Limiting

Prevent abuse with rate limits on document uploads.

### 4. Audit Logging

Log all AI mapping operations for compliance and debugging.

## Best Practices

1. **Provide Expected Document Name**: Helps AI validate document type
2. **Use Custom Prompts**: For complex or non-standard documents
3. **Log Extraction Results**: Track confidence and errors
4. **Handle Low Confidence**: Implement review workflow for < 0.7 confidence
5. **Validate After Mapping**: Check for validation errors before proceeding

## Summary

The OCR Mapping Adapter:
- **Independent service** - works with any text input
- Transforms unstructured text to structured JSON
- Uses AI (AWS Bedrock or Google Gemini)
- Validates and formats data automatically
- Supports custom prompts per document type
- Returns confidence scores and validation errors
- Used across multiple features: document upload, registration, data normalization

**Common Integrations**:
- Standalone: Convert any text to JSON
- With OCR Processing: Extract and structure document data
- With Storage: Save files after data extraction
- All three: Complete document processing pipeline

---

**Related Documentation**:
- **Service Adapters** - How adapters work together
- **OCR Processing Adapter** - Extract text from images
- **Storage Adapter** - Store files in cloud

