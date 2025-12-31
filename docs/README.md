# Documentation Structure

This directory contains comprehensive technical documentation for the Beneficiary Backend system.

## Quick Navigation

### 📖 System Reference
**File**: `system-reference.md`

Main entry point for technical reference documentation explaining how the system works internally.

---

### 📄 Document Processing
**Folder**: `01-document-processing/`

Learn how documents are processed through OCR, AI mapping, and storage.

**Pages**:
- `README.md` - Overview
- `01-service-adapters.md` - Adapter pattern and architecture
- `02-ocr-processing.md` - Text extraction from images/PDFs
- `03-ocr-mapping.md` - AI-powered field extraction
- `04-file-storage.md` - Cloud storage (S3, GCS, Azure)

---

### 🔐 Verifiable Credentials
**Folder**: `02-verifiable-credentials/`

Understand verifiable credential creation and management using Dhiway platform.

**Pages**:
- `README.md` - Overview
- `01-vc-processing-cron.md` - Automated VC event processing

---

### ⚙️ Configuration
**Folder**: `03-configuration/`

Configuration reference for AI models, providers, and system settings.

**Pages**:
- `README.md` - Overview
- `01-ai-model-parameters.md` - AI model configuration
- `02-bedrock-model-switching.md` - Claude model selection

---

## Directory Structure

```
docs/
├── system-reference.md                      # Main reference entry point
│
├── 01-document-processing/
│   ├── README.md                            # Overview
│   ├── 01-service-adapters.md
│   ├── 02-ocr-processing.md
│   ├── 03-ocr-mapping.md
│   └── 04-file-storage.md
│
├── 02-verifiable-credentials/
│   ├── README.md                            # Overview
│   └── 01-vc-processing-cron.md
│
├── 03-configuration/
│   ├── README.md                            # Overview
│   ├── 01-ai-model-parameters.md
│   └── 02-bedrock-model-switching.md
│
└── [Other files...]
```

## GitBook Import Structure

```
📘 Beneficiary Toaster
  └── 📖 Developer Guide
      │
      ├── 📚 Backend Guide (Setup/Steps)
      │   ├── Prerequisites
      │   ├── Environment Variables
      │   ├── Database Schema Setup
      │   ├── Build and Deploy Steps
      │   ├── Keycloak and Hasura Setup Guide
      │   └── Role and Access Control
      │
      └── 📖 System Reference (Explanatory)
          │
          ├── system-reference.md
          │
          ├── 📄 Document Processing
          │   ├── README.md
          │   ├── 01-service-adapters.md
          │   ├── 02-ocr-processing.md
          │   ├── 03-ocr-mapping.md
          │   └── 04-file-storage.md
          │
          ├── 🔐 Verifiable Credentials
          │   ├── README.md
          │   └── 01-vc-processing-cron.md
          │
          └── ⚙️ Configuration
              ├── README.md
              ├── 01-ai-model-parameters.md
              └── 02-bedrock-model-switching.md
```

## Documentation Types

### Backend Guide (Setup Documentation)
- **Purpose**: Step-by-step instructions to set up and run the system
- **Audience**: New developers, DevOps engineers
- **Content**: Prerequisites, installation, deployment

### System Reference (Technical Documentation)
- **Purpose**: Explain how the system works internally
- **Audience**: Developers extending/modifying the system
- **Content**: Architecture, services, technical decisions

## Key Principles

1. **Loose Coupling**: All services use adapter pattern for provider flexibility
2. **Configuration-Driven**: Provider selection via environment variables
3. **Service Independence**: Each service works standalone or combined
4. **Production-Ready**: Complete technical details without excessive code
