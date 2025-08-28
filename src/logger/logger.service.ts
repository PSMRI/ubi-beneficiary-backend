import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
    ];

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
    });
  }

  log(message: string, context?: string, level: string = 'info') {
    this.logger.log({ level, message, context });
    // Don't send debug messages to Sentry by default
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ message, trace, context });
    this.sendToSentry('error', message, context, trace);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ message, context });
    this.sendToSentry('warn', message, context);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ message, context });
    // Don't send debug messages to Sentry by default
  }

  // NestJS LoggerService interface methods
  verbose(message: any, context?: string) {
    this.debug(message, context);
  }

  fatal(message: any, context?: string) {
    this.error(message, undefined, context);
  }


  // New method for capturing exceptions with more context
  captureException(error: Error, context?: string, extra?: any) {
    this.error(error.message, error.stack, context);
    
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (context) scope.setTag('context', context);
        if (extra) scope.setContext('extra', extra);
        Sentry.captureException(error);
      });
    }
  }

  // New method for capturing messages with specific levels
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: string) {
    // Map Sentry levels to Winston levels
    const winstonLevel = level === 'warning' ? 'warn' : level;
    this.log(message, context, winstonLevel);
    
    // Directly capture to Sentry with proper level
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (context) scope.setTag('context', context);
        scope.setLevel(level as any);
        Sentry.captureMessage(message);
      });
    }
  }

  private sendToSentry(level: string, message: string, context?: string, trace?: string) {
    if (!process.env.SENTRY_DSN) return;

    try {
      if (level === 'error') {
        Sentry.captureException(new Error(message), {
          contexts: {
            winston: {
              level,
              message,
              context,
              trace,
              timestamp: new Date().toISOString(),
            }
          },
          level: 'error',
          tags: {
            logger: 'winston',
            context: context || 'unknown'
          }
        });
      } else if (level === 'warn') {
        Sentry.captureMessage(message, 'warning');
      } else if (level === 'info') {
        // Only capture info messages if they seem important
        if (message.toLowerCase().includes('error') || 
            message.toLowerCase().includes('fail') ||
            message.toLowerCase().includes('critical')) {
          Sentry.captureMessage(message, 'info');
        }
      }
    } catch (error) {
      console.error('❌ Error sending to Sentry:', error);
    }
  }
}

