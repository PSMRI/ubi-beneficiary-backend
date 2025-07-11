# Custom Fields Module

A modular NestJS module that provides dynamic custom fields functionality for entities like `User`, `Cohort`, etc., without altering their core schema.

## Features

- **Dynamic Field Management**: Create, update, and delete custom fields at runtime
- **Multiple Field Types**: Support for text, numeric, date, dropdown, checkbox, radio, email, phone, URL, file, JSON, currency, percent, rating, and more
- **Entity Agnostic**: Can be used with any entity type (Users, Cohorts, Organizations, etc.)
- **Validation**: Built-in validation based on field type and configuration
- **Search & Filter**: Search entities by custom field values
- **Multi-tenant Support**: Optional tenant-based field isolation

## Database Schema

### Fields Table
Stores field definitions and metadata.

| Column | Type | Description |
|--------|------|-------------|
| fieldId | UUID (PK) | Unique identifier for the field |
| name | VARCHAR | Internal name of the field |
| label | VARCHAR | Display name of the field |
| type | ENUM | Field type (text, numeric, date, etc.) |
| context | ENUM | Entity type (USERS, COHORTS, etc.) |
| contextType | VARCHAR | Subtype or role |
| fieldParams | JSONB | Additional parameters (options, validation) |
| fieldAttributes | JSONB | Field attributes (isEditable, etc.) |
| sourceDetails | JSONB | Source info for dynamic fields |
| dependsOn | JSONB | Dependency information |
| ordering | INT | Display order |
| isRequired | BOOLEAN | Whether the field is required |
| isHidden | BOOLEAN | Whether the field is hidden |
| tenantId | VARCHAR | Tenant ID for multi-tenant support |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

### FieldValues Table
Stores field values for specific entity instances.

| Column | Type | Description |
|--------|------|-------------|
| fieldValuesId | UUID (PK) | Unique identifier for the value |
| fieldId | UUID (FK) | References Fields.fieldId |
| itemId | UUID | Entity instance ID (userId, cohortId, etc.) |
| value | TEXT | Field value |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

## API Endpoints

### Field Management

#### Create Field
```http
POST /fields
```

**Request Body:**
```json
{
  "name": "currentSchoolDistrict",
  "label": "Current School District",
  "context": "USERS",
  "contextType": "User",
  "type": "text",
  "ordering": 7,
  "fieldParams": null,
  "fieldAttributes": {
    "isEditable": true,
    "isRequired": false
  },
  "sourceDetails": null,
  "dependsOn": {}
}
```

#### Get All Fields
```http
GET /fields?context=USERS&type=text&isRequired=false
```

#### Update Field
```http
PUT /fields/:fieldId
```

#### Delete Field
```http
DELETE /fields/:fieldId
```

### Field Values Management

#### Create/Update Field Values
```http
PUT /fields/create-update/field-value
```

**Request Body:**
```json
{
  "itemId": "user-123",
  "fields": [
    {
      "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",
      "value": "10"
    },
    {
      "fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",
      "value": "100000"
    }
  ]
}
```

#### Get Field Values for Entity
```http
GET /fields/values/:itemId
```

#### Get Entity with Custom Fields
```http
GET /fields/entity/:itemId/:context
```

#### Delete Field Value
```http
DELETE /fields/values/:fieldId/:itemId
```

#### Delete All Field Values for Entity
```http
DELETE /fields/values/:itemId
```

### Search & Filter

#### Search by Custom Fields
```http
GET /fields/search/:context?fieldName=value
```

## Field Types

| Type | Description | Validation |
|------|-------------|------------|
| text | Single-line text | String validation |
| textarea | Multi-line text | String validation |
| numeric | Number | Number validation |
| date | Date only | Date format validation |
| datetime | Date and time | ISO 8601 validation |
| drop_down | Single select | Must match allowed options |
| multi_select | Multiple select | Array of allowed options |
| checkbox | Boolean/Multi-checkbox | Boolean/Array validation |
| radio | Single select | Must match allowed options |
| email | Email address | Email format validation |
| phone | Phone number | Phone format validation |
| url | URL | URL format validation |
| file | File reference | File upload handling |
| json | JSON data | JSON schema validation |
| currency | Monetary value | Number validation |
| percent | Percentage | 0-100 validation |
| rating | Star/numeric rating | Range validation |

## Integration with Other Modules

### Users Module Integration

The custom fields module can be integrated with the Users module to add dynamic fields to user profiles:

```typescript
// In users.service.ts
import { CustomFieldsService } from '../customfields/customfields.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly customFieldsService: CustomFieldsService,
    // ... other dependencies
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Create user logic
    const user = await this.userRepository.save(userData);

    // Handle custom fields if provided
    if (createUserDto.customFields) {
      await this.customFieldsService.createOrUpdateFieldValues({
        itemId: user.user_id,
        fields: createUserDto.customFields,
      });
    }

    return user;
  }

  async getUserWithCustomFields(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    const customFields = await this.customFieldsService.getEntityWithCustomFields(
      userId,
      FieldContext.USERS,
    );

    return {
      ...user,
      customFields: customFields.customFields,
    };
  }
}
```

### DTO Updates

Update the user DTOs to include custom fields:

```typescript
// In create-user.dto.ts
export class CreateUserDto {
  // ... existing fields

  @ApiProperty({
    type: [CustomFieldValue],
    description: 'Custom field values',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldValue)
  customFields?: CustomFieldValue[];
}
```

## Usage Examples

### Creating a Dropdown Field

```typescript
const dropdownField = await customFieldsService.createField({
  name: 'bloodGroup',
  label: 'Blood Group',
  context: FieldContext.USERS,
  type: FieldType.DROP_DOWN,
  fieldParams: {
    options: [
      { name: 'A+', value: 'A_POSITIVE' },
      { name: 'A-', value: 'A_NEGATIVE' },
      { name: 'B+', value: 'B_POSITIVE' },
      { name: 'B-', value: 'B_NEGATIVE' },
      { name: 'O+', value: 'O_POSITIVE' },
      { name: 'O-', value: 'O_NEGATIVE' },
      { name: 'AB+', value: 'AB_POSITIVE' },
      { name: 'AB-', value: 'AB_NEGATIVE' },
    ],
  },
  isRequired: true,
  ordering: 1,
});
```

### Setting Field Values

```typescript
await customFieldsService.createOrUpdateFieldValues({
  itemId: 'user-123',
  fields: [
    {
      fieldId: 'blood-group-field-id',
      value: 'A_POSITIVE',
    },
    {
      fieldId: 'linkedin-field-id',
      value: 'https://linkedin.com/in/johndoe',
    },
  ],
});
```

### Searching by Custom Fields

```typescript
const userIds = await customFieldsService.searchByCustomFields(
  FieldContext.USERS,
  {
    bloodGroup: 'A_POSITIVE',
    district: 'Mumbai',
  },
);
```

## Configuration

The module supports the following configuration options:

- **Multi-tenant**: Set `tenantId` to isolate fields per tenant
- **Field ordering**: Use `ordering` to control display order
- **Required fields**: Set `isRequired` for mandatory fields
- **Hidden fields**: Set `isHidden` for system-only fields
- **Field dependencies**: Use `dependsOn` for conditional fields

## Testing

Run the tests for the custom fields module:

```bash
npm run test src/modules/customfields
```

## Dependencies

- `@nestjs/common`
- `@nestjs/typeorm`
- `@nestjs/swagger`
- `class-validator`
- `class-transformer`
- `typeorm` 