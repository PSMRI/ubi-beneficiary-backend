# Encryption Key Rotation

Simple and robust encryption key rotation for production environments.

## Overview

- **Single encryption key** stored in `ENCRYPTION_KEY` environment variable
- **Safe migration** with transaction rollback and error recovery
- **Batch processing** for memory efficiency

## Usage

### Generate New Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Test Migration (Dry Run)

**Secure Method (Recommended):**
```bash
# Create a temporary environment file (excluded from git)
echo "ENCRYPTION_KEY=your_current_key_here" > .env.key-rotation
echo "NEW_ENCRYPTION_KEY=your_new_key_here" >> .env.key-rotation

# Load environment and run dry-run
set -a && source .env.key-rotation && set +a
ts-node scripts/key-rotation.ts --dry-run

# Clean up
rm .env.key-rotation
```

**Alternative Method:**
```bash
# Export variables in current session
export ENCRYPTION_KEY='your_current_key_here'
export NEW_ENCRYPTION_KEY='your_new_key_here'

# Run dry-run
ts-node scripts/key-rotation.ts --dry-run
```

### Execute Migration

**Secure Method (Recommended):**
```bash
# Create a temporary environment file (excluded from git)
echo "ENCRYPTION_KEY=your_current_key_here" > .env.key-rotation
echo "NEW_ENCRYPTION_KEY=your_new_key_here" >> .env.key-rotation

# Load environment and execute migration
set -a && source .env.key-rotation && set +a
ts-node scripts/key-rotation.ts

# Clean up
rm .env.key-rotation
```

**Alternative Method:**
```bash
# Export variables in current session
export ENCRYPTION_KEY='your_current_key_here'
export NEW_ENCRYPTION_KEY='your_new_key_here'

# Execute migration
ts-node scripts/key-rotation.ts
```

## What Gets Migrated

- **`user_docs.doc_data`** - User document data
- **`user_applications.application_data`** - Application data  
- **`fieldValues.value`** - Encrypted custom fields

## Features

✅ **Safe** - Transaction-based with rollback on failure  
✅ **Robust** - Continues processing if individual records fail  
✅ **Efficient** - Batch processing (100 records at a time)  
✅ **Detailed** - Progress tracking and error statistics  

## Important Notes

1. **Always backup database** before running migration
2. **Test with dry run** first to verify everything works
3. **Update ENCRYPTION_KEY** environment variable after successful migration
4. **Restart application** to use the new key

## Security Best Practices

⚠️ **Never expose encryption keys in command history**
- Avoid inline environment variables like `KEY=value command`
- Use temporary `.env` files or export variables separately
- Keys in command line are visible in shell history and process listings
- Always clean up temporary environment files after use