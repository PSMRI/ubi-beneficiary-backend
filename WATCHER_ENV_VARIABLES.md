# Watcher Environment Variables

The following environment variables need to be added to your `.env` file for the watcher functionality to work properly:

## Required Environment Variables

### E-Wallet Watcher Configuration
```env
# E-Wallet watcher API URL
WALLET_WATCHER_URL=localhost:3018/api/wallet/vcs/watch

# E-Wallet authentication token
WALLET_AUTH_TOKEN=8779cc8a-a1fc-499c-9b19-400551041739
```

### QR Code (Dhiway) Watcher Configuration
```env
# Dhiway watcher API URL
DHIWAY_WATCHER_URL=https://api.depwd.onest.dhiway.net/api/watch

# Dhiway session cookie
DHIWAY_COOKIE=connect.sid=s%3Ae2I4C8LHipRmYG3apc6Nge5J2eVsseCw.gokVPhLHYd%2BWjdks1qjcsKFyLdxpBVFinpIHkJi44FU
```

### Base URL Configuration
```env
# Base URL for callback endpoints
BASE_URL=http://localhost:3000
```

## Optional Environment Variables

If not provided, the system will use these default values:
- `WALLET_WATCHER_URL`: `localhost:3018/api/wallet/vcs/watch`
- `WALLET_AUTH_TOKEN`: `8779cc8a-a1fc-499c-9b19-400551041739`
- `DHIWAY_WATCHER_URL`: `https://api.depwd.onest.dhiway.net/api/watch`
- `DHIWAY_COOKIE`: `connect.sid=s%3Ae2I4C8LHipRmYG3apc6Nge5J2eVsseCw.gokVPhLHYd%2BWjdks1qjcsKFyLdxpBVFinpIHkJi44FU`
- `BASE_URL`: `http://localhost:3000`

## Database Migration

Run the following SQL script to add the required columns to the `user_docs` table:

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
```

## How It Works

1. When a document is uploaded with `imported_from` set to "e-wallet" or "QR Code"
2. The system automatically attempts to register a watcher
3. If successful, the document is updated with:
   - `watcher_registered`: `true`
   - `watcher_email`: The email used for registration
   - `watcher_callback_url`: The callback URL used for registration

## API Endpoints

The watcher registration is automatically triggered when documents are uploaded through:
- `POST /users/user_docs` - Single document
- `POST /users/wallet/user_docs` - Multiple documents (recommended) 