import * as Sentry from "@sentry/nestjs";

// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/options/#tracesSampleRate
  tracesSampleRate: 0.1,
  
  // Additional configuration options
  debug: process.env.NODE_ENV === 'development',
  
  // Automatically capture console errors
  integrations: [
    // Add any additional integrations here
    Sentry.nestIntegration(),
  ],
});

// Test Sentry initialization
if (process.env.SENTRY_DSN) {
  console.log('Sentry initialized with environment:', process.env.SENTRY_ENVIRONMENT);
} else {
  console.warn('⚠️ SENTRY_DSN not found - Sentry will not capture events');
}
