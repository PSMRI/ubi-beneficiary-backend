# Simple Field Data Encryption Migration Script

A one-time migration script to encrypt sensitive field data using the existing EncryptionService. Designed for simplicity and single-use execution.

## Features

- ✅ **Dry-run mode** - Preview changes without execution
- ✅ **Simple operation** - Straightforward encryption process
- ✅ **Secure by default** - No backup files created
- ✅ **Transaction safety** - Automatic rollback on errors
- ✅ **Smart detection** - Skip already encrypted data

## Sensitive Fields

The script will encrypt the following fields:
- `aadhaar`
- `bankAccountNumber` 
- `bankIfscCode`
- `annualIncome`
- `udid`

## How it Works

### Field Attributes Handling
Preserves existing `fieldAttributes` and adds `isEncrypted: true`:

**Before:**
```json
{
  "isEditable": true,
  "isRequired": false
}
```

**After:**
```json
{
  "isEditable": true,
  "isRequired": false,
  "isEncrypted": true
}
```

### Field Value Encryption
- Only encrypts field values that aren't already encrypted
- Uses the existing `EncryptionService` with AES-256-GCM algorithm
- Skips null/empty values automatically

## Prerequisites

Set these environment variables either:

**Option A: Create a .env file in the project root:**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
ENCRYPTION_KEY=your_base64_encoded_32_byte_key
```

**Option B: Export them in your shell:**
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=your_username
export DB_PASSWORD=your_password
export DB_NAME=your_database
export ENCRYPTION_KEY=your_base64_encoded_32_byte_key
```

## Usage

### Preview Changes (Dry Run) - **RECOMMENDED FIRST**
```bash
npm run script:encrypt-fields -- --dry-run
```

### Run Live Migration
```bash
npm run script:encrypt-fields
```

### Show Help
```bash
npm run script:encrypt-fields -- --help
```

### Alternative Direct Commands
```bash
# Direct execution (if you have ts-node globally installed)
npx ts-node -r tsconfig-paths/register scripts/encrypt-fields-migration.ts --dry-run
npx ts-node -r tsconfig-paths/register scripts/encrypt-fields-migration.ts --help
npx ts-node -r tsconfig-paths/register scripts/encrypt-fields-migration.ts
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without execution |
| `--help` | Show help message |

## Output Example

### Dry Run
```
[2025-01-15T10:30:00.000Z] 🚀 Starting Field Encryption Migration...
[2025-01-15T10:30:01.000Z] ✅ Database connected
[2025-01-15T10:30:01.000Z] ✅ Encryption service ready
[2025-01-15T10:30:02.000Z] 🎯 Found 3 fields to encrypt: aadhaar, bankAccountNumber, annualIncome
[2025-01-15T10:30:02.000Z] 🏃 DRY RUN MODE - No changes will be made
[2025-01-15T10:30:03.000Z] 🔧 Updating field attributes...
[2025-01-15T10:30:03.000Z]   ✓ aadhaar: fieldAttributes updated
[2025-01-15T10:30:03.000Z]   ✓ bankAccountNumber: fieldAttributes updated
[2025-01-15T10:30:03.000Z]   ✓ annualIncome: fieldAttributes updated
[2025-01-15T10:30:04.000Z] 🔐 Encrypting field values...
[2025-01-15T10:30:04.000Z] 📊 Processing 150 field values...

📋 MIGRATION SUMMARY
====================
Mode: DRY RUN
Fields updated: 3
Values encrypted: 150

🏃 This was a dry run. Run without --dry-run to execute.
```

### Live Migration
```
[2025-01-15T10:35:00.000Z] 🚀 Starting Field Encryption Migration...
[2025-01-15T10:35:01.000Z] ✅ Database connected
[2025-01-15T10:35:01.000Z] ✅ Encryption service ready
[2025-01-15T10:35:02.000Z] 🎯 Found 3 fields to encrypt: aadhaar, bankAccountNumber, annualIncome
[2025-01-15T10:35:03.000Z] 🔧 Updating field attributes...
[2025-01-15T10:35:03.000Z]   ✓ aadhaar: fieldAttributes updated
[2025-01-15T10:35:03.000Z]   ✓ bankAccountNumber: fieldAttributes updated
[2025-01-15T10:35:03.000Z]   ✓ annualIncome: fieldAttributes updated
[2025-01-15T10:35:04.000Z] 🔐 Encrypting field values...
[2025-01-15T10:35:04.000Z] 📊 Processing 150 field values...

📋 MIGRATION SUMMARY
====================
Mode: LIVE MIGRATION
Fields updated: 3
Values encrypted: 150

✅ Migration completed successfully!
```

## Troubleshooting

### Common Issues

1. **Database Password Error**
   ```
   Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
   ```
   **Solution**: Ensure DB_PASSWORD environment variable is set correctly.

2. **Missing Environment Variables**
   ```
   Error: Missing required environment variables: DB_HOST, DB_PASSWORD
   ```
   **Solution**: Set all required environment variables.

3. **No Fields Found**
   ```
   ✅ All sensitive fields are already encrypted
   ```
   **Solution**: Migration already completed or fields don't exist.

## Security Notes

- **No backup files created** to avoid storing sensitive data in plain text
- The script logs progress but never logs sensitive data values
- Ensure ENCRYPTION_KEY is properly secured and backed up
- Test with --dry-run first
- **Ensure you have proper database backups** before running

## One-Time Usage

This script is designed for **one-time execution**:
1. Run `--dry-run` first to verify what will be changed
2. Run without flags to execute the migration
3. Script will detect already encrypted fields and skip them on subsequent runs
4. Delete the script after successful migration if desired

For any issues, ensure all prerequisites are met and test in development environment first. 