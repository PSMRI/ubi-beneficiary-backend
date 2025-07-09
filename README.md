# UBI Beneficiary Backend (beneficiary-backend)

## Description
Backend for Reference Beneficiary App


## Project setup
```bash
$ npm install
```

## Compile and run the project
```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests
```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment
- [deployment documentation](https://docs.nestjs.com/deployment) for more information.

## Resources
Check out a few resources that may come in handy when working with NestJS:
- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## License
Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# 🐕 Husky Git Hooks Setup Guide

## Manual Setup

```bash
# Install Husky hooks
npm run install && npm run prepare

# Set Git hooks path (required for Husky to work)
git config core.hooksPath .husky/_

# Verify hooks are executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

# Check Git configuration
git config core.hooksPath
# Should output: .husky/_
```