# UBI Beneficiary Backend - Developer Guide

## Overview

The UBI Beneficiary Backend is a NestJS-based application that serves as the backend for a Universal Benefit Interface (UBI) beneficiary management system. It integrates with multiple external services including Keycloak for authentication, Hasura for GraphQL data management, digital wallet services, and verifiable credentials (VC) APIs for document verification.

## Enhanced Architecture Section

### Key Features

#### Data Storage
- **PostgreSQL 17** stores user data, user documents, user applications, user consent, and user roles
- **TypeORM** for database operations and entity management
- **Encryption** for sensitive data using AES-256-GCM

#### Authentication
- **Keycloak** is used for Identity and Access Management (IAM)
- Handles user authentication, authorization, registration, and login processes
- JWT token management and validation

#### Benefit Applications
- Users can apply for benefits provided by different providers
- Application process runs through the **ONEST network**
- Integration with external benefit provider APIs

#### Application Tracking
- Status of each user application is tracked through **ONEST APIs**
- Real-time status updates via scheduled cron jobs

### Backend Modules (NestJS)

#### Authentication Module
- User login and registration (Keycloak integration)
- JWT issuance and validation
- Route protection with guards
- Logout and token revocation

#### User Module
- User profile CRUD operations
- Role and permission management
- Scheduled background jobs (profile populator, status updates)
- User data validation and encryption

#### Keycloak Service
- Keycloak integration for authentication and user management
- Admin operations for user creation, deletion, and updates
- Token management and refresh

#### Content Module
- Benefit/content search and filtering
- Caching and eligibility checks
- Data formatting and transformation
- Hasura integration for data operations

#### Hasura Integration
- **HasuraService**: Handles GraphQL queries/mutations to Hasura for job and user data
- **GraphQL Queries**: Used for complex joins and fetching related data
- Multiple database table management (cache, response_cache, seeker, order, telemetry)

#### Middleware
- Decodes JWT from request headers
- Extracts user ID and roles
- Attaches user information to request object for downstream use

### Background Jobs (CRON Jobs)

#### 1. Application Status Update CRON
- **Frequency**: Every 30 minutes
- **Purpose**: Updates the status of user applications
- **Process**: 
  - Fetches applications not in final state (not 'AMOUNT RECEIVED' or 'REJECTED')
  - Calls ONEST 'on_status' API using 'external_application_id'
  - Updates application status in database

#### 2. Profile Populator CRON
- **Frequency**: Every 5 minutes
- **Purpose**: Periodically updates user profiles
- **Process**:
  - Fetches users needing updates
  - Runs profile population logic
  - Ensures user data is fresh and complete

### API Documentation
- **Swagger documentation** auto-generated for REST APIs
- Accessible at `/docs` endpoint
- Input validation and error handling via NestJS pipes and filters


## Complete API Documentation

### 12 Key API Examples with Full Curl Commands

#### 1. Register with Password
Register a new user on 'username'-'password' basis.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/auth/register_with_password' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Content-Type: application/json' \
--data '{
   "firstName": "xxx",
   "lastName": "xxxxx",
   "phoneNumber": "1324567890",
   "password": "xxxxxxxx"
}'
```

#### 2. Login
Login to the beneficiary app.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/auth/login' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Content-Type: application/json' \
--data '{"username":"","password":""}'
```

#### 3. Logout
Logout of the app.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/auth/logout' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Content-Type: application/json' \
--data '{"access_token":<access_token>,"refresh_token":<refresh_token>}'
```

#### 4. Get My Consents
Retrieve user consents.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/get_my_consents' \
--header 'Accept: */*' \
--header 'Authorization: Bearer <token>'
```

#### 5. Consent
Create or update user consent.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/consent' \
--header 'Accept: */*' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{"user_id":"4d37-9f87-217f828afc43","purpose":"sign_up_tnc","purpose_text":"sign_up_tnc","accepted":true}'
```

#### 6. Get One User
Retrieve user information with optional data decryption.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/get_one/?decryptData=true' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>'
```

#### 7. User Documents (with encryption details)
Import user documents. Documents are passed as an array in the request body. Each document must contain doc_type, doc_subtype, doc_name, doc_data, imported_from and doc_datatype. doc_data is encrypted before saving to the database.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/wallet/user_docs' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data-raw '[
   {
       "doc_name": "Aadhaar Card",
       "doc_type": "idProof",
       "doc_subtype": "aadhaar",
       "doc_data": {
           "<Aadhaar_Data>"
       },
       "uploaded_at": "2024-12-03T12:57:45.557Z",
       "imported_from": "e-wallet",
       "doc_datatype": "Application/JSON"
   }
]'
```

#### 8. User Applications List
Retrieve list of user applications with optional filtering.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/user_applications_list' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{"filters":{"user_id":"605bb1ee-e6d4-400c-b52e-0ff17da12bd3","benefit_id":"PB-BTR-2024-12-02-000726"}}'
```

#### 9. User Application (GET)
Retrieve specific user application.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/user_application/be0e44f7-fc60-4fad-b7ae-e603eb8b2ef2' \
--header 'Accept: */*' \
--header 'Authorization: Bearer <token>'
```

#### 10. User Application (POST)
Create new user application.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/users/user_application' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
       "<Application_Data>"
}'
```

#### 11. Document List
Retrieve available document types.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/content/documents_list' \
--header 'Accept: */*' \
--header 'Authorization: Bearer <token>'
```

#### 12. Search Benefits
Search for available benefits with filtering options.

```bash
curl --location 'https://your-beneficiary-api-domain.com/api/content/search' \
--header 'Accept: application/json, text/plain, */*' \
--header 'Content-Type: application/json' \
--data '{"filters":{"caste":"","annualIncome":""},"search":""}'
```

### ONEST-related APIs with Reference to Documentation
For the following APIs, understanding of ONEST APIs is required. Refer to the [Tech Documentation for ONEST Network](https://docs.google.com/document/d/1HB4Z9vcRL8YG4fXlFbb1gFBvTHhiRCiClnzpc2PO1Uc/edit?usp=sharing):

1. **Search benefits**
2. **Select Benefit**
3. **Apply to benefit**
4. **Confirm application**
5. **Track application status**