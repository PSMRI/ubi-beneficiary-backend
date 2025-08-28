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
					winston.format.simple(),
				),
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

	log(message: any, ...optionalParams: any[]) {
		const [context] = optionalParams as [string?];
		this.logger.log({ level: 'info', message, context });
	}

	error(message: any, ...optionalParams: any[]) {
		const [trace, context] = optionalParams as [string?, string?];
		this.logger.error({ message, trace, context });
		this.sendToSentry('error', String(message), context, trace);
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
		this.logger.error({
			message: error.message,
			trace: error.stack,
			context,
			extra,
		});
		this.sendToSentry('error', error.message, context, error.stack);
	}

	// New method for capturing messages with specific levels
	captureMessage(
		message: string,
		level: 'info' | 'warning' | 'error' = 'info',
		context?: string,
	) {
		// Map Sentry levels to Winston levels
		const winstonLevel = level === 'warning' ? 'warn' : level;
		this.logger.log({ level: winstonLevel, message, context });

		if (!process.env.SENTRY_DSN) {
			return;
		}

		Sentry.withScope((scope) => {
			if (context) scope.setTag('context', context);
			scope.setLevel(level as any);
			Sentry.captureMessage(message);
		});
	}

	private sendToSentry(
		level: string,
		message: string,
		context?: string,
		trace?: string,
	) {
		if (!process.env.SENTRY_DSN) return;

		try {
			if (level === 'error') {
				const err = new Error(message);
				if (trace) {
					err.stack = trace;
				}
				Sentry.withScope((scope) => {
					scope.setLevel('error' as any);
					scope.setTag('logger', 'winston');
					if (context) {
						scope.setTag('context', context);
					}
					scope.setContext('winston', {
						level,
						message,
						context,
						timestamp: new Date().toISOString(),
					});
					Sentry.captureException(err);
				});
			} else if (level === 'warn') {
				Sentry.captureMessage(message, 'warning');
			} else if (level === 'info') {
				// Only capture info messages if they seem important
				if (
					message.toLowerCase().includes('error') ||
					message.toLowerCase().includes('fail') ||
					message.toLowerCase().includes('critical')
				) {
					Sentry.captureMessage(message, 'info');
				}
			}
		} catch (error) {
			this.logger.warn({
				message: 'Error sending to Sentry',
				context: 'LoggerService',
				error,
			});
		}
	}
}
