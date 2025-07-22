# Custom Fields with Encryption Support

This module provides dynamic custom field management with optional encryption support for sensitive data.

## Features

- **Dynamic Field Creation**: Create custom fields for any entity type (Users, Cohorts, Applications)
- **Multiple Field Types**: Support for text, numeric, date, dropdown, checkbox, and more
- **Optional Encryption**: Encrypt sensitive field values using AES-256-GCM
- **Type Validation**: Automatic validation based on field type and constraints
- **Search Support**: Search entities by custom field values (excluding encrypted fields)

## Encryption Support

### Overview

The custom fields system now supports optional encryption for sensitive field values. When encryption is enabled for a field:

- Values are automatically encrypted before storage
- Values are automatically decrypted when retrieved
- Encryption uses AES-256-GCM with authentication
- Type validation is still applied before encryption

### Security Features

- **AES-256-GCM**: Military-grade encryption with authentication
- **Unique IV**: Each encryption uses a random initialization vector
- **Authentication**: Data integrity is verified during decryption
- **No Search**: Encrypted fields cannot be searched (by design)

### Usage

#### Creating an Encrypted Field

```typescript
// Create a field with encryption enabled
const encryptedField = {
  name: 'ssn',
  label: 'Social Security Number',
  context: 'USERS',
  type: 'text',
  ordering: 15,
  fieldParams: {
    validation: {
      regex: '^\\d{3}-\\d{2}-\\d{4}$',
      minLength: 11,
      maxLength: 11,
    },
  },
  fieldAttributes: {
    isEditable: true,
    isRequired: false,
    isEncrypted: true, // Enable encryption
  },
};
```

#### Updating Field Encryption

```typescript
// Enable encryption (only if field has no existing values)
const updateDto = {
  fieldAttributes: {
    isEditable: true,
    isRequired: false,
    isEncrypted: true,
  },
};

// Note: Cannot disable encryption once enabled
```

### API Endpoints

#### Create Field with Encryption

```http
POST /fields
Content-Type: application/json

{
  "name": "ssn",
  "label": "Social Security Number",
  "context": "USERS",
  "type": "text",
  "ordering": 15,
  "fieldParams": {
    "validation": {
      "regex": "^\\d{3}-\\d{2}-\\d{4}$"
    }
  },
  "fieldAttributes": {
    "isEditable": true,
    "isRequired": false,
    "isEncrypted": true
  }
}
```

#### Update Field Encryption

```http
PUT /fields/{fieldId}
Content-Type: application/json

{
  "fieldAttributes": {
    "isEditable": true,
    "isRequired": false,
    "isEncrypted": true
  }
}
```

### Encryption Rules

1. **Enable Encryption**: Can only be enabled for fields with no existing values
2. **Disable Encryption**: Cannot be disabled once enabled (security requirement)
3. **Type Validation**: Still applies before encryption
4. **Search Limitation**: Encrypted fields cannot be searched

### Error Handling

The system provides clear error messages for encryption-related operations:

- `Cannot enable encryption for field "fieldName" because it has X existing values`
- `Field "fieldName" already has encryption enabled`
- `Cannot disable encryption for field "fieldName". Once encryption is enabled, it cannot be disabled`
- `Failed to encrypt field value: [error details]`
- `Failed to decrypt field value: [error details]`

### Configuration

Encryption requires the `ENCRYPTION_KEY` environment variable:

```bash
# Must be a base64-encoded 32-byte key
ENCRYPTION_KEY=dGVzdC1rZXktZm9yLWVuY3J5cHRpb24tdGVzdGluZw==
```

### Field Types Supporting Encryption

All field types support encryption:

- `text`, `textarea`, `email`, `phone`, `url`
- `numeric`, `currency`, `percent`, `rating`
- `date`, `datetime`
- `checkbox`, `radio`
- `drop_down`, `multi_select`
- `json`
- `file`

### Example Use Cases

1. **Personal Information**: SSN, passport numbers, driver's license
2. **Financial Data**: Bank account numbers, credit card numbers
3. **Medical Information**: Health records, insurance numbers
4. **Legal Documents**: Case numbers, legal identifiers

### Testing

Run the encryption service tests:

```bash
npm test -- field-encryption.service.spec.ts
```

### Security Considerations

1. **Key Management**: Ensure encryption keys are securely stored and rotated
2. **Access Control**: Limit access to encrypted fields based on user roles
3. **Audit Logging**: Log access to encrypted fields for compliance
4. **Backup Security**: Ensure encrypted data is backed up securely
5. **No Search**: Encrypted fields cannot be searched - this is by design for security

### Migration Notes

- Existing fields can be encrypted only if they have no values
- Once encrypted, fields cannot be unencrypted
- Encrypted values are stored as base64-encoded strings
- The system automatically handles encryption/decryption transparently 