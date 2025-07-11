# Custom Fields Integration with Users Module

This document describes how the custom fields functionality has been integrated with the Users module to provide dynamic, extensible user profiles.

## Overview

The Users module now supports custom fields that can be added, updated, and retrieved dynamically without modifying the core user schema. This integration allows for flexible user data management while maintaining backward compatibility.

## Features

- **Dynamic User Fields**: Add custom fields to user profiles at runtime
- **Type-Safe Validation**: Built-in validation for different field types
- **Backward Compatibility**: Existing user functionality remains unchanged
- **Comprehensive API**: Full CRUD operations for custom fields
- **Search & Filter**: Search users by custom field values

## Database Schema

The integration uses two additional tables:

### `fields` Table
Stores field definitions and metadata for all custom fields.

### `fieldValues` Table
Stores actual field values for specific users.

## API Endpoints

### User Creation with Custom Fields

**Endpoint:** `POST /users/create`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "sso_provider": "google",
  "sso_id": "12345",
  "phoneNumber": "555-555-5555",
  "customFields": [
    {
      "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",
      "value": "A+"
    },
    {
      "fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",
      "value": "Mumbai"
    }
  ]
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "User created successfully.",
  "data": {
    "user_id": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "customFields": [
      {
        "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",
        "name": "bloodGroup",
        "label": "Blood Group",
        "type": "drop_down",
        "value": "A+"
      },
      {
        "fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",
        "name": "currentSchoolDistrict",
        "label": "Current School District",
        "type": "text",
        "value": "Mumbai"
      }
    ]
  }
}
```

### User Update with Custom Fields

**Endpoint:** `PUT /users/update/:userId`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "customFields": [
    {
      "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",
      "value": "B+"
    }
  ]
}
```

### Get User with Custom Fields

**Endpoint:** `GET /users/get_one`

**Response:**
```json
{
  "statusCode": 200,
  "message": "User retrieved successfully.",
  "data": {
    "user_id": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "customFields": [
      {
        "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",
        "name": "bloodGroup",
        "label": "Blood Group",
        "type": "drop_down",
        "value": "A+",
        "fieldParams": {
          "options": [
            { "name": "A+", "value": "A_POSITIVE" },
            { "name": "A-", "value": "A_NEGATIVE" }
          ]
        }
      }
    ]
  }
}
```

### Get Specific User with Custom Fields

**Endpoint:** `GET /users/:userId/custom-fields`

**Response:**
```json
{
  "statusCode": 200,
  "message": "User with custom fields retrieved successfully",
  "data": {
    "user_id": "user-123",
    "firstName": "John",
    "lastName": "Doe",
    "customFields": [...]
  }
}
```

### Update User Custom Fields Only

**Endpoint:** `PUT /users/:userId/custom-fields`

**Request Body:**
```json
{
  "fields": [
    {
      "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",
      "value": "B+"
    },
    {
      "fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",
      "value": "Delhi"
    }
  ]
}
```

## DTOs

### CreateUserDto
```typescript
export class CreateUserDto {
  firstName: string;
  lastName: string;
  email?: string;
  sso_provider: string;
  sso_id: string;
  phoneNumber?: string;
  dob?: Date;
  image?: string;
  customFields?: CustomFieldValueDto[];
}
```

### UpdateUserDto
```typescript
export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  sso_provider?: string;
  sso_id?: string;
  phoneNumber?: string;
  dob?: Date;
  image?: string;
  customFields?: CustomFieldValueDto[];
}
```

### CustomFieldValueDto
```typescript
export class CustomFieldValueDto {
  @IsUUID()
  fieldId: string;

  @IsString()
  value: string;
}
```

## Service Methods

### UserService Methods

#### `create(createUserDto: CreateUserDto)`
Creates a new user and handles custom fields if provided.

#### `update(userId: string, updateUserDto: any)`
Updates user information and custom fields.

#### `findOne(req: any, decryptData?: boolean)`
Retrieves user data including custom fields.

#### `getUserWithCustomFields(userId: string)`
Retrieves a specific user with all custom fields.

#### `deleteUser(userId: string)`
Deletes a user and all associated custom field values.

## Field Management

### Creating Custom Fields

Before using custom fields, you need to create field definitions using the Custom Fields API:

```bash
POST /fields
{
  "name": "bloodGroup",
  "label": "Blood Group",
  "context": "USERS",
  "type": "drop_down",
  "fieldParams": {
    "options": [
      { "name": "A+", "value": "A_POSITIVE" },
      { "name": "A-", "value": "A_NEGATIVE" },
      { "name": "B+", "value": "B_POSITIVE" },
      { "name": "B-", "value": "B_NEGATIVE" },
      { "name": "O+", "value": "O_POSITIVE" },
      { "name": "O-", "value": "O_NEGATIVE" },
      { "name": "AB+", "value": "AB_POSITIVE" },
      { "name": "AB-", "value": "AB_NEGATIVE" }
    ]
  },
  "isRequired": true,
  "ordering": 1
}
```

### Field Types Supported

- `text` - Single-line text
- `textarea` - Multi-line text
- `numeric` - Numbers
- `date` - Date only
- `datetime` - Date and time
- `drop_down` - Single select dropdown
- `multi_select` - Multiple select
- `checkbox` - Boolean/Multi-checkbox
- `radio` - Single select radio buttons
- `email` - Email address
- `phone` - Phone number
- `url` - URL
- `file` - File reference
- `json` - JSON data
- `currency` - Monetary value
- `percent` - Percentage
- `rating` - Star/numeric rating

## Validation

The integration includes comprehensive validation:

1. **Field Type Validation**: Values are validated based on field type
2. **Required Field Validation**: Required fields must have values
3. **Option Validation**: Dropdown/radio values must match allowed options
4. **Format Validation**: Email, URL, date formats are validated
5. **UUID Validation**: Field IDs must be valid UUIDs

## Error Handling

The integration provides detailed error responses:

```json
{
  "statusCode": 400,
  "errorMessage": "Field Blood Group must be a valid option: A_POSITIVE, A_NEGATIVE, B_POSITIVE, B_NEGATIVE, O_POSITIVE, O_NEGATIVE, AB_POSITIVE, AB_NEGATIVE"
}
```

## Search and Filter

You can search users by custom field values using the Custom Fields API:

```bash
GET /fields/search/USERS?bloodGroup=A_POSITIVE&district=Mumbai
```

This returns user IDs that match the specified custom field criteria.

## Migration Guide

### For Existing Users

Existing users without custom fields will continue to work normally. The `customFields` property will be an empty array or undefined.

### For New Features

When adding new custom fields:

1. Create the field definition using the Custom Fields API
2. Update your frontend to include the new field
3. The backend will automatically handle validation and storage

## Security Considerations

- Custom fields are validated on both client and server side
- Field definitions are controlled by the backend
- User authentication is required for all custom field operations
- Field values are sanitized before storage

## Performance Considerations

- Custom fields are loaded lazily when requested
- Field definitions are cached for better performance
- Database indexes are optimized for custom field queries
- Bulk operations are supported for better performance

## Testing

The integration includes comprehensive tests:

```bash
# Run user service tests
npm run test src/modules/users/users.service.spec.ts

# Run custom fields tests
npm run test src/modules/customfields
```

## Example Usage

### Frontend Integration

```typescript
// Create user with custom fields
const createUser = async (userData) => {
  const response = await fetch('/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      sso_provider: 'google',
      sso_id: '12345',
      customFields: [
        { fieldId: 'blood-group-field-id', value: 'A_POSITIVE' },
        { fieldId: 'district-field-id', value: 'Mumbai' }
      ]
    })
  });
  return response.json();
};

// Get user with custom fields
const getUser = async (userId) => {
  const response = await fetch(`/users/${userId}/custom-fields`);
  return response.json();
};
```

### Backend Integration

```typescript
// In your service
@Injectable()
export class MyService {
  constructor(private readonly userService: UserService) {}

  async processUser(userId: string) {
    const userWithCustomFields = await this.userService.getUserWithCustomFields(userId);
    
    // Access custom fields
    const bloodGroup = userWithCustomFields.customFields.find(
      field => field.name === 'bloodGroup'
    )?.value;
    
    // Process based on custom field values
    if (bloodGroup === 'A_POSITIVE') {
      // Handle A+ blood group
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Field Not Found**: Ensure the field definition exists before setting values
2. **Validation Errors**: Check field type and constraints
3. **Permission Errors**: Ensure user is authenticated
4. **Database Errors**: Check database connection and schema

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// In your service
this.logger.debug('Custom fields data:', customFields);
```

## Future Enhancements

- Bulk custom field operations
- Custom field templates
- Advanced search and filtering
- Custom field analytics
- Field dependency management
- Multi-language support for field labels 