# Verifiable Credentials

The beneficiary backend integrates with Dhiway's Verifiable Credential (VC) system to create and manage tamper-proof digital certificates.

## What are Verifiable Credentials?

Verifiable Credentials are digital documents that:
- ✅ Cannot be tampered with
- ✅ Can be cryptographically verified
- ✅ Are owned by the user (self-sovereign identity)
- ✅ Can be shared without revealing unnecessary data

## How VCs Work

### VC Creation Flow
```
Document Upload → OCR → Validation → VC Creation → Dhiway Storage
```

### VC Verification Flow
```
User Presents VC → Backend Verifies → Dhiway Platform Check → Verified ✓
```

## Key Features

- **Automated VC Generation** - Create VCs from verified documents
- **Dhiway Integration** - Store VC proofs on Dhiway platform
- **Background Processing** - Cron job processes VC events on configurable schedule
- **Event Tracking** - Monitor VC creation, issuance, and verification

## Supported VC Types

- Marksheet VCs
- Bonafide Certificate VCs

## Pages in This Section

- **VC Processing Cron System** - Automated VC event processing

