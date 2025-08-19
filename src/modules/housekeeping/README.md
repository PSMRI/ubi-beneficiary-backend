# Housekeeping Module

The Housekeeping Module provides secure endpoints for database migrations and data operations. All operations require a secret key for authentication.

## Environment Variables

Add the following environment variable to your `.env` file:

```env
HOUSEKEEPING_SECRET_KEY=your-secure-secret-key-here
```

## API Endpoints

### 1. Register Watchers for Existing Documents

**Endpoint:** `POST /housekeeping/register-watchers`

**Description:** Register watchers for existing documents that don't have watchers registered.

**Request Body:**
```json
{
  "secretKey": "your-secure-secret-key-here",
  "allDocuments": true,
  "documentIds": ["doc-id-1", "doc-id-2"],
  "forceReregister": false
}
```

**Parameters:**
- `secretKey` (required): The secret key for authentication
- `allDocuments` (optional): If true, register watchers for all documents. If false, only register for specific document IDs
- `documentIds` (optional): Array of specific document IDs to register watchers for
- `forceReregister` (optional): If true, re-register watchers even if they already exist

**Response:**
```json
{
  "statusCode": 200,
  "message": "Watcher registration completed",
  "data": {
    "totalDocuments": 100,
    "processedDocuments": 100,
    "successfulRegistrations": 95,
    "failedRegistrations": 5,
    "results": [
      {
        "success": true,
        "docId": "doc-id-1",
        "message": "Watcher registered successfully"
      }
    ]
  }
}
```

### 2. Get Migration Status

**Endpoint:** `GET /housekeeping/migration-status`

**Description:** Get the status of various migration operations.

**Request Body:**
```json
{
  "secretKey": "your-secure-secret-key-here",
  "operation": "register_watchers"
}
```

**Parameters:**
- `secretKey` (required): The secret key for authentication
- `operation` (required): The operation to check status for (currently supports "register_watchers")

**Response:**
```json
{
  "statusCode": 200,
  "message": "Watcher registration status retrieved",
  "data": {
    "totalDocuments": 100,
    "registeredWatchers": 80,
    "unregisteredWatchers": 20,
    "registrationPercentage": 80.0
  }
}
```

## Usage Examples

### Register Watchers for All Documents

```bash
curl -X POST http://localhost:3000/housekeeping/register-watchers \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "your-secure-secret-key-here",
    "allDocuments": true
  }'
```

### Register Watchers for Specific Documents

```bash
curl -X POST http://localhost:3000/housekeeping/register-watchers \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "your-secure-secret-key-here",
    "documentIds": ["doc-id-1", "doc-id-2", "doc-id-3"]
  }'
```

### Check Watcher Registration Status

```bash
curl -X GET http://localhost:3000/housekeeping/migration-status \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "your-secure-secret-key-here",
    "operation": "register_watchers"
  }'
```

## Features

### Batch Processing
- Documents are processed in batches of 10 to avoid overwhelming the system
- 1-second delay between batches to avoid rate limiting
- Concurrent processing within each batch

### Error Handling
- Comprehensive error handling for each document
- Detailed logging for debugging
- Graceful failure handling - continues processing even if some documents fail

### Security
- Secret key authentication required for all operations
- No public access to housekeeping endpoints
- Secure validation of all inputs

### Monitoring
- Detailed progress logging
- Success/failure statistics
- Individual document result tracking

## Prerequisites

1. **User Wallet Tokens**: Users must have valid wallet tokens stored in the `users` table
2. **Wallet Configuration**: The following environment variables must be set:
   - `WALLET_BASE_URL`
   - `WALLET_AUTH_TOKEN`
   - `DHIWAY_WATCHER_EMAIL`
   - `BASE_URL`

3. **Document Structure**: Documents must have valid `doc_data_link` fields that can be parsed to extract identifiers and record public IDs

## Notes

- The module automatically extracts identifier and recordPublicId from the `doc_data_link` field
- Watcher registration status is tracked in the `user_docs` table
- Failed registrations are logged but don't stop the overall process
- The module is designed to be idempotent - running it multiple times is safe 