# Configuration

Configuration reference for AI models, external service providers, and system behavior customization.

## Configuration Categories

### AI Model Configuration
- AWS Bedrock (Claude models)
- Google Gemini
- Model parameters (temperature, tokens, etc.)

### Provider Configuration
- OCR providers (AWS Textract, Google Gemini, Tesseract)
- Storage providers (AWS S3, Google Cloud, Azure)
- AI mapping providers (Bedrock, Gemini)
- VC providers (Dhiway)

### Environment Variables
All configuration is managed through environment variables for:
- Security (no hardcoded credentials)
- Flexibility (change without code deployment)
- Environment-specific settings (dev, staging, prod)

## Common Tasks

### Switch OCR Provider
```bash
OCR_PROVIDER=google-gemini
GEMINI_API_KEY=your-key
```

### Change AI Model
```bash
OCR_MAPPING_BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
```

### Configure Storage
```bash
FILE_STORAGE_PROVIDER=s3
AWS_S3_BUCKET_NAME=beneficiary-uploads
```

## Pages in This Section

- **AI Model Parameters** - Comprehensive AI model configuration
- **Bedrock Model Switching** - How to switch between Claude models

