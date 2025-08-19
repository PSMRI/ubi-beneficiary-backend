# Step-by-Step Guide: Using Cursor AI Rules

## Overview

This guide explains how to effectively use the cursor AI rules for the beneficiary-backend project. The rules are designed to be **selective and contextual**, not comprehensive, to maintain performance and relevance.

## Available Rules

### Core Project Rules
- **`beneficiary-backend-rules.mdc`** - Project-specific conventions and business logic

### Backend Architecture Rules
- **`backend-1-architectural-patterns.mdc`** - System architecture and design patterns
- **`backend-2-rest-api-design-standards.mdc`** - REST API design principles
- **`backend-3-code-quality.mdc`** - Code quality and organization standards
- **`backend-4-data-validation.mdc`** - Data validation and sanitization
- **`backend-5-error-handling.mdc`** - Error handling and exception management
- **`backend-6-performance-optimization.mdc`** - Performance optimization techniques
- **`backend-7-security-implementation.mdc`** - Security implementation guidelines
- **`backend-8-testing-standards.mdc`** - Testing strategies and standards

### NestJS Framework Rules
- **`nestjs-1-core-architecture.mdc`** - NestJS core architecture patterns
- **`nestjs-2-api-design-rest.mdc`** - NestJS REST API design
- **`nestjs-3-documentation.mdc`** - API documentation and Swagger setup
- **`nestjs-4-deployment-config.mdc`** - Deployment and configuration
- **`nestjs-5-error-handling.mdc`** - NestJS error handling patterns
- **`nestjs-6-database-performance.mdc`** - Database and performance optimization
- **`nestjs-7-security-auth.mdc`** - Authentication and authorization
- **`nestjs-8-testing-quality.mdc`** - Testing strategies for NestJS

## Quick Start

### Step 1: Identify Your Task Type
- **New Feature** → API endpoint, service, module
- **Bug Fix** → Error handling, debugging
- **Security** → Authentication, validation, authorization
- **Performance** → Database optimization, caching
- **Documentation** → API docs, code comments
- **Testing** → Unit tests, integration tests

### Step 2: Select Rules (2-5 rules)
**Always Include:**
- `beneficiary-backend-rules.mdc` (project context)

**Add Based on Task:**
- API work → `backend-2-rest-api-design-standards.mdc` + `nestjs-2-api-design-rest.mdc`
- Database → `nestjs-6-database-performance.mdc`
- Security → `backend-7-security-implementation.mdc` + `nestjs-7-security-auth.mdc`
- Error handling → `backend-5-error-handling.mdc` + `nestjs-5-error-handling.mdc`

### Step 3: Configure & Use
1. Open Cursor AI settings → Rules
2. Clear existing rules
3. Add selected rules
4. Ask specific questions
5. Review and iterate

## Rule Selection by Task Type

### 🚀 **New Features**
- **Basic Feature (2-3 rules)**: `beneficiary-backend-rules.mdc` + `backend-1-architectural-patterns.mdc` + `nestjs-1-core-architecture.mdc`
- **API Endpoint (4-5 rules)**: Add `backend-2-rest-api-design-standards.mdc` + `nestjs-2-api-design-rest.mdc` + `backend-4-data-validation.mdc` + `nestjs-5-error-handling.mdc`
- **Complex with DB (5-6 rules)**: Add `nestjs-6-database-performance.mdc` + `backend-5-error-handling.mdc`

### 🐛 **Bug Fixes**
- **General (3 rules)**: `beneficiary-backend-rules.mdc` + `backend-5-error-handling.mdc` + `nestjs-5-error-handling.mdc`
- **Data/Validation (3-4 rules)**: Add `backend-4-data-validation.mdc`
- **Performance (3-4 rules)**: `beneficiary-backend-rules.mdc` + `backend-6-performance-optimization.mdc` + `nestjs-6-database-performance.mdc`

### 🔒 **Security**
- **Auth/Authorization (4 rules)**: `beneficiary-backend-rules.mdc` + `backend-7-security-implementation.mdc` + `nestjs-7-security-auth.mdc` + `backend-5-error-handling.mdc`
- **Data Security (3-4 rules)**: Add `backend-4-data-validation.mdc`

### 📚 **Documentation & Testing**
- **API Docs (2-3 rules)**: `beneficiary-backend-rules.mdc` + `nestjs-3-documentation.mdc` + `backend-2-rest-api-design-standards.mdc`
- **Testing (3-4 rules)**: `beneficiary-backend-rules.mdc` + `backend-8-testing-standards.mdc` + `nestjs-8-testing-quality.mdc`

## Practical Examples

### Example 1: User Registration Endpoint
**Rules**: `beneficiary-backend-rules.mdc` + `backend-2-rest-api-design-standards.mdc` + `nestjs-2-api-design-rest.mdc` + `backend-4-data-validation.mdc` + `nestjs-5-error-handling.mdc` + `backend-7-security-implementation.mdc`

**Why**: Project context + API standards + validation + error handling + security

### Example 2: Database Performance Fix
**Rules**: `beneficiary-backend-rules.mdc` + `nestjs-6-database-performance.mdc` + `backend-6-performance-optimization.mdc` + `backend-5-error-handling.mdc`

**Why**: Project context + DB optimization + performance + error handling

### Example 3: Document Upload
**Rules**: `beneficiary-backend-rules.mdc` + `backend-7-security-implementation.mdc` + `backend-4-data-validation.mdc` + `nestjs-5-error-handling.mdc`

**Why**: Project context + security + validation + error handling

## Performance Tips

1. **Start Minimal** - Begin with 2-3 essential rules, add as needed
2. **Avoid Overlap** - Choose specific rules for your tech stack
3. **Update Regularly** - Keep `beneficiary-backend-rules.mdc` current with project conventions

## Common Combinations

### **Quick API Development**
```
beneficiary-backend-rules.mdc + backend-2-rest-api-design-standards.mdc + nestjs-2-api-design-rest.mdc
```

### **Database Operations**
```
beneficiary-backend-rules.mdc + nestjs-6-database-performance.mdc + backend-4-data-validation.mdc
```

### **Security Implementation**
```
beneficiary-backend-rules.mdc + backend-7-security-implementation.mdc + nestjs-7-security-auth.mdc
```

### **Error Handling**
```
beneficiary-backend-rules.mdc + backend-5-error-handling.mdc + nestjs-5-error-handling.mdc
```

## Troubleshooting

### **AI Response Too Generic**
- Add more specific rules for your task
- Include `beneficiary-backend-rules.mdc` for project context
- Use framework-specific rules (NestJS) for detailed patterns

### **AI Response Too Slow**
- Reduce the number of active rules
- Remove rules not relevant to current task
- Start with minimal rules and add as needed

### **AI Not Following Project Conventions**
- Ensure `beneficiary-backend-rules.mdc` is included
- Add more specific project rules
- Update project rules with your conventions

## Best Practices

1. **Always start with project context** (`beneficiary-backend-rules.mdc`)
2. **Match rules to your specific task type**
3. **Start minimal (2-3 rules) and add as needed**
4. **Be specific in your prompts**
5. **Update project rules as your conventions evolve**

## Rule Maintenance

### **When to Update Rules**
- New team conventions are established
- Project architecture changes
- New external services are integrated
- Security requirements change
- Performance patterns evolve

### **How to Update Rules**
- Edit `beneficiary-backend-rules.mdc` for project-specific changes
- Update rule descriptions for clarity
- Add new rules for emerging patterns
- Remove outdated or unused rules 