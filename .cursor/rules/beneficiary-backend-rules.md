---
description: USE WHEN working on beneficiary backend specific features, business logic, or project conventions
globs: ["**/*"]
alwaysApply: false
---

# Beneficiary Backend Project Rules

## Project Overview
- **Repository**: beneficiary-backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Hasura GraphQL
- **Authentication**: Keycloak integration
- **Purpose**: Beneficiary management system for Piramal Foundation

## Project Architecture

### Core Technologies
- **NestJS**: Main framework for API development
- **TypeORM**: Database ORM with entity management
- **Hasura**: GraphQL API layer and data management
- **Keycloak**: Identity and access management
- **Docker**: Containerization and deployment

### Architecture Principles
- **Modular Design**: Feature-based modules following NestJS patterns
- **Service Layer**: External service integrations with proper abstraction
- **Shared Utilities**: Common helpers and utilities for reusability
- **Entity Management**: Database models with proper relationships
- **Credential Schemas**: Document schemas for verifiable credentials

### Flexible Structure Guidelines
- **Feature Modules**: Each feature should be self-contained with controller, service, and DTOs
- **Shared Code**: Common utilities, filters, interceptors, and middleware
- **External Services**: Integrations with third-party services (Hasura, Keycloak, etc.)
- **Database Layer**: Entities, repositories, and data access patterns
- **Configuration**: Environment-specific configurations and validation

## Development Conventions

### Module Structure
- Each feature module should contain: controller, service, module files
- DTOs should be organized in a dedicated subdirectory
- Follow consistent naming: `{feature}.controller.ts`, `{feature}.service.ts`
- Use proper dependency injection and module organization

### Entity Conventions
- Entities should be organized in a dedicated directory
- Use TypeORM decorators properly with appropriate relationships
- Follow consistent naming: `{entity_name}.entity.ts`
- Implement proper database constraints and indexes

### API Design Patterns
- Use consistent response format (success-response.ts, error-response.ts)
- Implement proper HTTP status codes
- Use DTOs for request/response validation
- Follow RESTful conventions

## Business Domain Rules

### User Management
- Users can have multiple roles through role management entities
- User information should be properly separated and managed
- Applications should be tracked per user with proper relationships
- Consent management is required for all data operations

### Document Management
- Documents should be encrypted using encryption services
- Support multiple credential types (BirthCertificate, CasteCertificate, etc.)
- Use document providers for type management and validation
- Implement proper document validation and verification workflows

### Authentication & Authorization
- Use Keycloak integration for authentication
- Implement role-based access control
- Use auth middleware for protected routes
- Handle OTP verification for sensitive operations

## Database Patterns

### Hasura Integration
- Use dedicated service for GraphQL operations
- Implement proper error handling and retry mechanisms
- Cache frequently accessed data for performance
- Use transactions for multi-step operations and data consistency

### Data Validation
- Validate all input using DTOs with class-validator
- Implement custom validators where needed
- Use encryption for sensitive data
- Implement proper data sanitization

## Security Requirements

### Data Protection
- Encrypt sensitive user data using encryption services
- Implement proper consent management workflows
- Use secure communication protocols and data transmission
- Log security-relevant events for audit and monitoring

### Access Control
- Implement role-based permissions
- Validate user permissions for each operation
- Use secure session management
- Implement audit trails for sensitive operations

## Error Handling

### Exception Management
- Use global exception filters for consistent error responses
- Log errors with proper context and correlation IDs
- Return user-friendly error messages with appropriate detail
- Include error codes for client-side error handling

### Validation Errors
- Use class-validator for DTO validation
- Return structured validation error responses
- Implement custom validation decorators where needed

## Testing Requirements

### Integration Testing
- Test API endpoints with proper database integration
- Test authentication and authorization flows
- Test document operations and workflows
- Test error handling and recovery scenarios

> **Note**: Unit testing requirements are currently relaxed due to fast-paced development mode. Focus on integration testing and manual testing for critical functionality.

## Performance Considerations

### Caching Strategy
- Cache frequently accessed data like user information and document lists
- Implement proper cache invalidation strategies
- Use appropriate caching solutions for session and data storage
- Monitor cache performance and hit rates

### Database Optimization
- Use proper indexing on frequently queried fields
- Optimize GraphQL queries in Hasura
- Implement pagination for large datasets
- Use connection pooling

## Deployment & Configuration

### Environment Management
- Use environment variables for all configuration and secrets
- Separate configurations for different environments (dev, staging, production)
- Never commit secrets or sensitive data to version control
- Use containerization for consistent deployments across environments

### Monitoring & Logging
- Use structured logging with proper correlation IDs and context
- Monitor API performance, response times, and throughput
- Track error rates, types, and patterns for proactive monitoring
- Monitor database performance and resource utilization

## Code Quality Standards

### TypeScript Best Practices
- Use strict TypeScript configuration
- Implement proper interfaces and types
- Avoid `any` type usage
- Use proper async/await patterns

### Code Organization
- Keep functions small and focused
- Use meaningful variable and function names
- Implement proper separation of concerns
- Follow SOLID principles

## External Service Integration

### GraphQL Service Integration
- Use dedicated services for GraphQL operations
- Implement proper error handling and retry mechanisms
- Cache query results where appropriate for performance
- Use subscriptions for real-time updates when needed

### Authentication Service Integration
- Use dedicated services for authentication and authorization
- Implement proper token validation and refresh mechanisms
- Handle token expiration and renewal gracefully
- Log authentication events for security monitoring

### External Service Integration
- Use dedicated services for external integrations
- Implement proper error handling and circuit breakers
- Cache external service responses where appropriate
- Handle service state synchronization and consistency

## Team Development Guidelines

### Code Organization Flexibility
- **Feature-First Approach**: Organize code by features rather than technical layers
- **Consistent Patterns**: Use consistent patterns across all features
- **Modular Design**: Keep modules self-contained with clear boundaries
- **Shared Utilities**: Extract common functionality into shared utilities
- **Configuration Management**: Use centralized configuration management

### Collaborative Development
- **Code Reviews**: Implement mandatory code reviews for all changes
- **Documentation**: Keep documentation updated with code changes
- **Testing**: Focus on integration testing and manual testing for critical features
- **Branching Strategy**: Use feature branches with clear naming conventions
- **Merge Strategy**: Use pull requests with proper descriptions and testing

### Feature Development Workflow
- **Planning**: Define clear requirements and acceptance criteria
- **Implementation**: Follow established patterns and conventions
- **Testing**: Perform integration testing and manual testing for critical paths
- **Documentation**: Update relevant documentation
- **Review**: Submit for code review and address feedback
- **Deployment**: Follow proper deployment procedures

### Code Quality Standards
- **Consistency**: Follow established coding standards and patterns
- **Readability**: Write self-documenting code with clear naming
- **Maintainability**: Design for future changes and extensions
- **Performance**: Consider performance implications of design decisions
- **Security**: Implement security best practices throughout

### Change Management
- **Backward Compatibility**: Maintain backward compatibility when possible
- **Migration Strategy**: Plan for database and API migrations
- **Feature Flags**: Use feature flags for gradual rollouts
- **Monitoring**: Monitor changes for potential issues
- **Rollback Plan**: Have rollback strategies for critical changes 