### 

### Goal: 

Create a **modular NestJS module called customfields** to associate extra custom fields for entities like `User`, `Cohort`, etc., **without altering their core schema**.

### 

### Functionality 

The service should allow adding, updating, and removing custom fields at runtime, without altering the core entities table schema.

\> \- It should support CRUD operations for both field definitions and user-specific field values.

\> \- When fetching an entity, the service should return both static fields and all custom fields (with metadata and values).

\> \- The design should be generic and extensible, so it can be reused for other entities (like Cohort or any other) in the future.

\> \- Use NestJS best practices (modules, services, DTOs, TypeORM entities, etc.).

\> \- Include example API endpoints for:

\> \- Creating/updating/deleting a custom field

\> \- Setting/updating/removing a custom field value for a user

\> \- Fetching a user with all their custom fields supporting filter on custom fields as well

\> \- Provide the database schema (entities) and sample payloads for each endpoint.

### DB Design

**1\. fields Table**

Stores the definition/metadata of each custom field.

Column Name	Type	Description

fieldId	UUID (PK)	Unique identifier for the field

label	VARCHAR	Display name of the field

type	VARCHAR	Data type (e.g., text, number, date, etc.)

context	VARCHAR	Entity type (e.g., 'User', 'Cohort')

contextType	VARCHAR	(Optional) Subtype or role

fieldParams	JSONB	Additional params (options, validation, etc.)

sourceDetails	JSONB	Source info for dynamic fields

ordering	INT	Display order

isRequired	BOOLEAN	Whether the field is required

isHidden	BOOLEAN	Whether the field is hidden

createdAt	TIMESTAMP	When the field was created

updatedAt	TIMESTAMP

**2\. fieldValues Table**

Stores the value of each custom field for a specific entity instance.

Column Name	Type	Description

fieldValuesId	UUID (PK)	Unique identifier for the value row

fieldId	UUID (FK)	References Fields.fieldId

itemId	UUID	The ID of the entity instance (e.g., userId, cohortId, etc)

value	TEXT/JSONB	The value for this field (type depends on field)

createdAt	TIMESTAMP	When the value was created

updatedAt	TIMESTAMP	When the value was last updated

itemId is a generic reference: it can point to a User, Cohort, etc., depending on the context.

### API Design:

#### **FIELDS ENDPOINTS:** 

* `POST /fields`: Create new custom field (e.g., blood group, LinkedIn, etc.)  
  *{*  
      *"name": "currentSchoolDistrict",*  
      *"label": "Current School District",*  
      *"context": "USERS",*  
      *"contextType": "User",*  
      *"type": "text",*  
      *"ordering": 7,*  
      *"fieldParams": **null**,*  
      *"fieldAttributes": {*  
          *"isEditable": **true**,*  
          *"isRequired": **false***  
      *},*  
      *"sourceDetails": **null**,*  
      *"dependsOn": {}*  
  *}*


   

* `GET /fields`: Get all field definitions (for UI rendering)  
* `PUT /fields/:fieldID`: update Fields in fields table  
  *{*  
    *"name": "string",              // (optional) The internal name of the field*  
    *"label": "string",             // (optional) The display label of the field*  
    *"context": "string",           // (optional) The entity type (e.g., "User", "Cohort")*  
    *"contextType": "string",       // (optional) Subtype or role*  
    *"type": "text",                // (optional) Field type (must match allowed enum)*  
    *"ordering": 0,                 // (optional) Display order*  
    *"required": **true**,              // (optional) Is the field required?*  
    *"tenantId": "string",          // (optional) Tenant ID if multi-tenant*  
    *"fieldParams": {               // (optional) Additional parameters*  
      *"isCreate": **false**,*  
      *"options": \[*  
        *{ "name": "Option 1", "value": "option1" },*  
        *{ "name": "Option 2", "value": "option2" }*  
      *\]*  
    *},*  
    *"fieldAttributes": {},         // (optional) Any extra attributes*  
    *"sourceDetails": {},           // (optional) Source info for dynamic fields*  
    *"dependsOn": "string"          // (optional) Dependency info*  
  *}*

* `PUT /fields/create-update/field-value`: add/update Fields values in **fieldValues** table  
  {  
    "itemId": "userId-or-cohortId", // userId in case of user, cohortId in case of cohort, etc.  
    "fields": \[  
      {  
        "fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",  
        "value": "10"  
      },  
      {  
        "fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",  
        "value": "100000"  
      }  
    \]  
  }


#### USERS ENDPOINTS:

* `POST /users`: Create user (core \+ dynamic fields)

*{*  
  *"firstName": "Ping",*  
  *"lastName": "Pong",*  
  *"gender": "female",*  
  *"username": "pingpong1234987",*  
  *"password": "qwerty",*  
  *"customFields": \[*  
    *{*  
      *"fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",*  
      *"value": "10"*  
    *},*  
    *{*  
      *"fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",*  
      *"value": "100000"*  
    *}*  
  *\]*  
*}*

After the user is created in the database. The user service will loop through the customFields array and call the customfields service’s create API for each field value.Internally call this  `/fields/create-update/field-value`

*{*  
  *"itemId": "userId-or-cohortId", // userId in case of user, cohortId in case of cohort, etc.*  
  *"fields": \[*  
    *{*  
      *"fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",*  
      *"value": "10"*  
    *},*  
    *{*  
      *"fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",*  
      *"value": "100000"*  
    *}*  
  *\]*  
*}*

* `GET /users/:userId`: Get user data (merged core \+ custom fields)  
    
* `PUT /users/:userId`: Update user and custom fields  
  *{*  
      *"username": "string",*  
      *"firstName": "string",*  
      *"middleName": "string",*  
      *"lastName": "string",*  
      *"gender": "male",*  
      *"role": "string",*  
      *"dob": "1990-01-01",*  
      *"email": "test@gmail.com",*  
      *"district": "string",*  
      *"state": "string",*  
      *"address": "string",*  
      *"pincode": "string",*  
      *"createdBy": "string",*  
      *"updatedBy": "string",*  
       
      *"status": "active",*  
      *"reason": "string",*  
      *"action": "add",*  
      *"customFields": \[*  
          *{*  
              *"fieldId": "2cc58846-dbcf-45e9-8295-5e853c7f3af8",*  
              *"value": "hellyyo"*  
          *}*  
      *\]*  
  *}*  
  Once a user is updated in the database.The user service will loop through the customFields array and call the customfields service’s update API for each field value.here customfields array is optional first check if custom fields coming in payload update or create it. Internally call this  `/fields/create-update/field-value`  
    
  *{*  
    *"itemId": "userId-or-cohortId", // userId in case of user, cohortId in case of cohort, etc.*  
    *"fields": \[*  
      *{*  
        *"fieldId": "5ace9c31-6b32-4327-b161-0828165ec32c",*  
        *"value": "10"*  
      *},*  
      *{*  
        *"fieldId": "2fb99694-ba65-49d3-9278-87957c95bc91",*  
        *"value": "100000"*  
      *}*  
    *\]*  
  *}*


  
	

### **How integration of custom fields with other entities will work**

Custom fields are defined in a generic **fields** table and their values are stored in a **fieldValues** table, linked to each entity instance by itemId. Entities like User and Cohort include a customFields array in their DTOs, which is used for creation, update, and fetch operations. The backend services handle validation, storage, and retrieval of these fields, allowing any entity to have extensible, dynamic fields without schema changes. Filtering and searching by custom fields is also supported at the database level

#### **Custom Field Creation Rules**

* Support field types: `"text"`, `"numeric"`, `"drop_down"`, `"checkbox"`, `"radio", etc include all types`  
* Store metadata in `fieldAttributes` (e.g., isEditable, validation regex, isEncrypted, etc.)

* `fieldParams` for dropdown/checkbox options


| Field Type | Description | DB Column Type (FieldValues.value) | Data Handling / Validation Example |
| :---- | :---- | :---- | :---- |
| text | Single-line text | TEXT | String, max length, regex |
| textarea | Multi-line text | TEXT | String, max length |
| numeric | Integer or decimal number | NUMERIC or DOUBLE PRECISION | Number, min/max, integer/float check |
| date | Date only | DATE | Date format (YYYY-MM-DD) |
| datetime | Date and time | TIMESTAMP | ISO 8601, timezone handling |
| drop\_down | Single select from options | VARCHAR or TEXT | Must match one of allowed options |
| multi\_select | Multiple select from options | TEXT (JSON array or CSV) | Array of allowed options |
| checkbox | Boolean or multi-checkbox | BOOLEAN or TEXT (for multi) | true/false or array of options |
| radio | Single select from options | VARCHAR or TEXT | Must match one of allowed options |
| email | Email address | VARCHAR | Email format validation |
| phone | Phone number | VARCHAR | Regex/format validation |
| url | URL | VARCHAR | URL format validation |
| file | File reference (URL/path) | VARCHAR or TEXT | File upload handling, store URL/path |
| json | Arbitrary JSON data | JSONB | JSON schema validation |
| currency | Monetary value | NUMERIC(12,2) | Number, currency format |
| percent | Percentage | NUMERIC(5,2) | 0-100, decimal allowed |
| rating | Star or numeric rating | INTEGER or NUMERIC | Range check (e.g., 1-5) |


**Data Handling & Validation (in Service/DTO Layer)**

* text/textarea: Validate as string, apply max length, regex if needed.  
* numeric/currency/percent/rating: Parse as number, check min/max, decimals.  
* date/datetime: Parse and validate date/time format.  
* drop\_down/radio: Ensure value is in allowed options.  
* multi\_select/checkbox: Store as JSON array or CSV string, validate all values are allowed.  
* boolean: Store as true/false.  
* json: Parse and validate as JSON.  
* file/url/email/phone: Validate format as per type.

