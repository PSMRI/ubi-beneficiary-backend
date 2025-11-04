# OCR Service

A modular OCR (Optical Character Recognition) service for extracting text from documents.

## 📁 Structure

```
src/services/ocr/
├── adapters/extractors/
│   └── aws-textract.adapter.ts    # AWS Textract implementation
├── factories/
│   └── text-extractor.factory.ts  # Factory to create OCR providers
├── interfaces/
│   └── text-extractor.interface.ts # Core OCR interface
├── ocr.service.ts                  # Main OCR service
└── ocr.module.ts                   # NestJS module
```

## 🚀 Usage

The OCR service is automatically integrated with the `/upload-document` API. When you upload a document, OCR extraction happens automatically and returns extracted text in the response.

### Example Response

```json
{
  "success": true,
  "data": {
    "doc_id": "123",
    "doc_path": "path/to/file.pdf",
    "ocr": {
      "extractedText": "Text from your document...",
      "confidence": 98.5,
      "metadata": {
        "processingTime": 1234,
        "provider": "aws-textract"
      }
    }
  }
}
```

## ⚙️ Configuration

Set environment variables in `.env`:

```bash
# Optional: Choose OCR provider (default: aws-textract)
OCR_PROVIDER=aws-textract

# AWS OCR Credentials (for Textract)
AWS_OCR_REGION=ap-south-1
AWS_OCR_ACCESS_KEY_ID=your_textract_key
AWS_OCR_SECRET_ACCESS_KEY=your_textract_secret

# AWS S3 Credentials (for file storage)
AWS_S3_REGION=ap-south-1
AWS_S3_ACCESS_KEY_ID=your_s3_key
AWS_S3_SECRET_ACCESS_KEY=your_s3_secret
AWS_S3_BUCKET_NAME=your_bucket_name
```

## 🔧 Adding New Providers

1. Create new adapter in `adapters/extractors/`
2. Implement `ITextExtractor` interface
3. Add to factory in `text-extractor.factory.ts`
4. Update environment config

## 📝 Features

- ✅ Modular architecture with adapters
- ✅ Multiple file formats (PDF, JPEG, PNG)
- ✅ Error handling (won't break uploads)
- ✅ Provider independence
- ✅ Clean, simple structure
