## Prerequisites

### System Requirements
- **Node.js**: Version 16+ (as specified in documentation)
- **npm**: Version 8 or higher
- **PostgreSQL**: Version 14+ (as specified in documentation)
- **Redis**: Version 6 or higher (for caching)
- **Docker**: Version 20 or higher (optional, for containerized deployment)

### Required Software Installations
```bash
# Install dependencies
npm install
```

### Service & Network Setup

#### The following external services must be available and configured before running the backend:

- **UBI Network setup(ONEST Network)**: For benefit applications and tracking
- **Keycloak Server**: Identity and access management
- **Hasura GraphQL Engine**: Data layer management
- **Wallet Service**: For beneficiary wallet onboarding
- **Verification Checker**: For document verification
- **Eligibility Checker**: For benefit eligibility checking

## Dependencies Overview

### Core Dependencies
- **@nestjs/core**: ^10.0.0 - NestJS framework core
- **@nestjs/common**: ^10.0.0 - Common NestJS utilities
- **@nestjs/platform-express**: ^10.0.0 - Express platform adapter
- **@nestjs/typeorm**: ^10.0.2 - TypeORM integration for database
- **@nestjs/config**: ^3.1.1 - Configuration management
- **@nestjs/swagger**: ^7.4.2 - API documentation
- **@nestjs/schedule**: ^4.0.0 - Task scheduling
- **@nestjs/axios**: ^3.1.2 - HTTP client for external APIs

### Database Dependencies
- **typeorm**: ^0.3.20 - TypeScript ORM
- **pg**: ^8.11.3 - PostgreSQL driver

### External Service Dependencies
- **axios**: ^1.9.0 - HTTP client
- **redis**: ^4.6.12 - Redis client
- **jwt-decode**: ^4.0.0 - JWT token decoding

### SDK Integrations
- **Eligibility Checker**: Integrated via REST API calls to `ELIGIBILITY_API_URL`
- **Verification Checker**: Integrated via REST API calls to `VC_VERIFICATION_SERVICE_URL`

### Development Dependencies
- **@nestjs/cli**: ^10.0.0 - NestJS CLI
- **typescript**: ^5.7.3 - TypeScript compiler
- **jest**: ^29.7.0 - Testing framework
- **eslint**: ^9.27.0 - Code linting
- **prettier**: ^3.5.3 - Code formatting

### Summary

- To successfully run the Beneficiary Backend, ensure:
- All required software (Node.js, npm, PostgreSQL, Redis, Docker) is installed.
- All dependent services (Keycloak, Hasura, Wallet, Verification, Eligibility, ONEST) are set up and accessible.
- Project dependencies are installed.