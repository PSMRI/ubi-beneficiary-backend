# Watcher Functionality Implementation

This document describes the implementation of automatic watcher registration for user documents based on their import source.

## Overview

The system now automatically registers watchers for documents imported from specific sources:
- **E-Wallet**: Registers watchers with the wallet service
- **QR Code**: Registers watchers with the Dhiway service

## Database Changes

### New Columns Added to `user_docs` Table

| Column | Type | Description |
|--------|------|-------------|
| `watcher_registered` | BOOLEAN | Indicates if a watcher is registered (default: false) |
| `watcher_email` | VARCHAR(255) | Email address used for watcher registration |
| `watcher_callback_url` | VARCHAR(500) | Callback URL for watcher notifications |

### SQL Migration

Run the following SQL script to add the new columns:

```sql
-- Add watcher_registered column
ALTER TABLE user_docs 
ADD COLUMN watcher_registered BOOLEAN DEFAULT FALSE;

-- Add watcher_email column
ALTER TABLE user_docs 
ADD COLUMN watcher_email VARCHAR(255);

-- Add watcher_callback_url column
ALTER TABLE user_docs 
ADD COLUMN watcher_callback_url VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN user_docs.watcher_registered IS 'Indicates if a watcher is registered for this document';
COMMENT ON COLUMN user_docs.watcher_email IS 'Email address used for watcher registration';
COMMENT ON COLUMN user_docs.watcher_callback_url IS 'Callback URL for watcher notifications';

-- Create index for better query performance
CREATE INDEX idx_user_docs_watcher_registered ON user_docs(watcher_registered);
CREATE INDEX idx_user_docs_imported_from ON user_docs(imported_from);
```

## Code Changes

### 1. Entity Updates (`src/entity/user_docs.entity.ts`)

Added three new columns to the `UserDoc` entity:
- `watcher_registered`: Boolean field with default false
- `watcher_email`: String field for email storage
- `watcher_callback_url`: String field for callback URL storage

### 2. DTO Updates (`src/modules/users/dto/user_docs.dto.ts`)

Added validation for the new fields:
- `watcher_registered`: Optional boolean with validation
- `watcher_email`: Optional email with validation
- `watcher_callback_url`: Optional string with validation

### 3. Service Updates (`src/modules/users/users.service.ts`)

#### New Methods Added:

1. **`registerWatcherForEWallet()`**: Registers watchers with the e-wallet service
   - Uses `vcPublicId` from document data
   - Sends POST request to wallet watcher API
   - Handles authentication with Bearer token

2. **`registerWatcherForQRCode()`**: Registers watchers with the Dhiway service
   - Uses `identifier` and `recordPublicId` from document data
   - Sends POST request to Dhiway watcher API
   - Handles authentication with session cookie

3. **`registerWatcher()`**: Main method that routes to appropriate watcher registration
   - Determines registration method based on `imported_from`
   - Extracts required data from document
   - Returns success/failure status

#### Updated Methods:

**`processSingleUserDoc()`**: Enhanced to include watcher registration
- Checks if `imported_from` is "e-wallet" or "QR Code"
- Attempts watcher registration after successful document save
- Updates document with watcher information on success
- Logs success/failure for monitoring

## Environment Variables

Add the following to your `.env` file:

```env
# E-Wallet Configuration
WALLET_WATCHER_URL=localhost:3018/api/wallet/vcs/watch

# Dhiway Configuration
DHIWAY_WATCHER_URL=https://api.depwd.onest.dhiway.net/api/watch
DHIWAY_COOKIE=YOUR_COOKIE_VALUE

# Base URL for callbacks
BASE_URL=http://localhost:3000
```

## API Integration

### E-Wallet Watcher Registration

**Endpoint**: `POST localhost:3018/api/wallet/vcs/watch`
**Headers**: 
- `Content-Type: application/json`
- `Authorization: Bearer {token}`

**Payload**:
```json
{
  "vcPublicId": "8016e800-2dfa-48f1-bd02-51cb769d7322",
  "email": "email@gmail.com",
  "callbackUrl": "http://callbackurl"
}
```

### QR Code Watcher Registration

**Endpoint**: `POST https://api.depwd.onest.dhiway.net/api/watch`
**Headers**:
- `Content-Type: application/json`
- `Cookie: {session_cookie}`

**Payload**:
```json
{
  "identifier": "stmt:cord:s3bunm28JaP4gdtHy2RLzM1u14aRtKL7zExoynxUmoymwMT6z:f828f8b1b0406dc51005993c57bb742a3a93f072f30591f1ef9aefd79d2cef83",
  "recordPublicId": "2790e9e2-678d-4e0f-a0e8-16be21036c5b",
  "email": "watcherankush@yopmail.com",
  "callbackUrl": "http://localhost:3018/api/wallet/vcs/watch/callback"
}
```

## Workflow

1. **Document Upload**: User uploads document with `imported_from` set to "e-wallet" or "QR Code"
2. **VC Verification**: System verifies the Verifiable Credential
3. **Document Save**: Document is saved to database and file system
4. **Watcher Registration**: System attempts to register watcher based on import source
5. **Status Update**: If watcher registration succeeds, document is updated with watcher information
6. **Logging**: All actions are logged for monitoring and debugging

## Error Handling

- **VC Verification Failure**: Document upload is rejected
- **Watcher Registration Failure**: Document is saved but watcher status remains false
- **Network Errors**: Retry logic and proper error logging
- **Missing Data**: Graceful handling of missing required fields

## Monitoring

The system logs all watcher registration attempts:
- **Success**: `Watcher registered successfully for document: {doc_id}`
- **Failure**: `Watcher registration failed for document: {doc_id}, Error: {message}`
- **Errors**: Detailed error logging for debugging

## Testing

To test the functionality:

1. **E-Wallet Document**:
   ```json
   {
     "user_id": "user-uuid",
     "doc_type": "Credential",
     "doc_subtype": "VC",
     "doc_name": "Test Credential",
     "imported_from": "e-wallet",
     "doc_data": {
       "vcPublicId": "test-vc-id",
       "credential": {...}
     },
     "doc_data_link": "Link to VC json",
     "watcher_email": "user@example.com",
     "watcher_callback_url": "https://callback.example.com/notify"
   }
   ```

2. **QR Code Document**:
   ```json
   {
     "user_id": "user-uuid",
     "doc_type": "Credential",
     "doc_subtype": "VC",
     "doc_name": "Test Credential",
     "imported_from": "QR Code",
     "doc_data": {
       "identifier": "test-identifier",
       "recordPublicId": "test-record-id",
       "credential": {...}
     },
    "doc_data_link": "https://.../qr-code-docs/user-uuid/test-record-id.json",
    "watcher_email": "user@example.com",
    "watcher_callback_url": "https://callback.example.com/notify"
   }
   ```

## Security Considerations

- All API calls use HTTPS
- Authentication tokens are stored in environment variables
- Sensitive data is encrypted in the database
- Error messages don't expose internal system details
- Timeout limits prevent hanging requests 