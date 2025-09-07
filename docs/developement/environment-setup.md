## Environment Setup

### 1. Clone and Initial Setup
```bash
# Fork and Clone the Repository
git clone <repository-url>
cd beneficiary-backend

# Check out the main branch
git checkout main

# Install dependencies
npm install

# Set up Git hooks (Husky)
npm run prepare
git config core.hooksPath .husky/_
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### 2. Environment Variable Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Application Configuration
NODE_ENV=development                    # Application environment (development/production/test)
PORT=3000                              # Server port number

# Encryption Configuration
ENCRYPTION_KEY=your_base64_encoded_32_byte_key  # Base64-encoded 32-byte key for AES-256-GCM encryption

# Database Configuration
DB_TYPE=postgres                       # Database type (postgres/mysql/sqlite/mariadb)
DB_HOST=localhost                      # Database host address
DB_PORT=5432                          # Database port number
DB_USERNAME=postgres                   # Database username
DB_PASSWORD=your_password              # Database password
DB_NAME=beneficiary_backend            # Database name

# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080     # Keycloak server URL
KEYCLOAK_ADMIN_CLI_CLIENT_SECRET=your_admin_cli_secret  # Admin CLI client secret
KEYCLOAK_REALM_NAME_APP=your_realm_name                # Application realm name
KEYCLOAK_CLIENT_NAME_APP=your_client_name              # Application client name
KEYCLOAK_ADMIN_USERNAME=admin                          # Keycloak admin username
KEYCLOAK_CLIENT_ID=your_client_id                      # Keycloak client ID
KEYCLOAK_GRANT_TYPE=client_credentials                 # OAuth grant type

# Hasura Configuration
HASURA_URL=http://localhost:8080/v1/graphql            # Hasura GraphQL endpoint
HASURA_GRAPHQL_ADMIN_SECRET=your_hasura_admin_secret   # Admin secret for Hasura
CACHE_DB=your_cache_table_name                         # Cache table name
RESPONSE_CACHE_DB=your_response_cache_table_name       # Response cache table name
SEEKER_DB=your_seeker_table_name                       # Seeker table name
ORDER_DB=your_order_table_name                         # Order table name
TELEMETRY_DB=your_telemetry_table_name                 # Telemetry table name

# Beckn Protocol Configuration
DOMAIN=your_domain                     # Beckn domain
BAP_ID=your_bap_id                     # Beckn Application Platform ID
BAP_URI=https://your_bap_uri           # Beckn Application Platform URI
BPP_ID=your_bpp_id                     # Beckn Provider Platform ID
BPP_URI=https://your_bpp_uri           # Beckn Provider Platform URI
BAP_CLIENT_URL=https://your_bap_client_url  # BAP client URL

# OTP Configuration
OTP_AUTH_KEY=your_otp_auth_key         # OTP service authentication key
OTP_CUSTOMER_ID=your_otp_customer_id   # OTP service customer ID
OTP_ENTITY_ID=your_otp_entity_id       # OTP service entity ID
OTP_MESSAGE_TYPE=your_otp_message_type # OTP message type
OTP_SOURCE_ATTR=your_otp_source_attr   # OTP source attribute
OTP_TEMPLATE_ID=your_otp_template_id   # OTP template ID

# SMS Configuration
SMS_API_URL=https://your_sms_api_url   # SMS service API URL

# Digital Wallet Configuration
WALLET_API_URL=https://your_wallet_api_url  # Digital wallet service URL

# VC Verification Service
VC_VERIFICATION_SERVICE_URL=https://your-vc-service.com/verify  # VC verification service URL
VC_DEFAULT_ISSUER_NAME=dhiway          # Default VC issuer name

# Eligibility API
ELIGIBILITY_API_URL=https://your-eligibility-service.com  # Eligibility checking service URL

# Default Signup Password
SIGNUP_DEFAULT_PASSWORD=default_password  # Default password for new user signups
```

### 3.2 Docker Infra `environment.env`

The `docker-compose.yml` requires a separate file `environment.env`.
Create it in the project root:

```env
# Database
DATABASE_NAME=uba_beneficiary_mw
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres

# pgAdmin
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=admin123

# Keycloak
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://postgres:5432/uba_beneficiary_mw
KC_DB_USERNAME=postgres
KC_DB_PASSWORD=postgres
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin123

# Hasura
HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:postgres@postgres:5432/uba_beneficiary_mw
HASURA_GRAPHQL_ADMIN_SECRET=hasura_secret
```

---

### 4. Docker Compose Setup

The `docker-compose.yml` is located in the **root of the repository**.
It provisions the following services:

* **Postgres** (port `5432`)
* **pgAdmin** (port `8082`)
* **Keycloak** (port `8080`)
* **Hasura GraphQL Engine** (port `8081`)

### 4.1 Start Services

```bash
docker-compose --env-file environment.env up -d
```

### 4.2 Verify Services

* pgAdmin: [http://localhost:8082](http://localhost:8082)
* Keycloak: [http://localhost:8080](http://localhost:8080)
* Hasura Console: [http://localhost:8081](http://localhost:8081)
* Database: `localhost:5432`

---
## 5. Database Schema Setup

Once the database service is running, you must create the schema before using the backend.

Follow the steps in [DB Schema](DB-schema.md) Setup
 to:
- Import the schema.pgsql file
- Create all required tables, indexes, and constraints
- Verify schema using pgAdmin or psql CLI

⚠️ This step is mandatory. The backend will not function until the schema is loaded.

---
## 6. External Service Setup

* **UBA Network** – Refer to [UBA Network Documentation](https://docs.google.com/document/d/1HB4Z9vcRL8YG4fXlFbb1gFBvTHhiRCiClnzpc2PO1Uc/edit?usp=sharing)
* **Wallet Service** – Refer to [Wallet Documentation](insert-link-here)
* **Verification Checker** – Refer to [Verification Documentation](https://docs.google.com/document/d/1Qs7T-cpFkm60GtNJSpS2bFdJZGrX42oDIzDLBAuUm94/edit?usp=sharing)
* **Eligibility Checker** – Refer to [Eligibility Documentation](https://docs.google.com/document/d/19n0XJ_kN9VCmDnw3bwmiw7Y5dFN1odYL1aJBgdObqVI/edit?usp=sharing)

---

## 7. Running the Backend

After services are up and `.env` is configured, run:

```bash
npm run start:dev
```

The backend will be available at:
👉 [http://localhost:3000](http://localhost:3000)

---

## 8. Build for Production

```bash
npm run build
npm run start:prod
```

---

## 9. Troubleshooting

* If containers fail, check logs with:

  ```bash
  docker-compose logs -f
  ```
* Ensure ports `5432`, `8080`, `8081`, and `8082` are free.
* Verify `.env` and `environment.env` values are correct.

---


