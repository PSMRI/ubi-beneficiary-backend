// Import this first!
import './common/tools/sentry.tools';

// Now import other modules
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
	VERSION_NEUTRAL,
	VersioningType,
	ValidationPipe,
	BadRequestException,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/Interceptors/response.interceptor';
import { I18nResponseInterceptor } from './common/Interceptors/i18n-response.interceptor';
import { I18nExceptionFilter } from './common/filters/i18n-exception.filter';
import { I18nService } from './common/services/i18n.service';
import { LoggerService } from './logger/logger.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Replace NestJS default logger with our Sentry-enabled logger
	const customLogger = app.get(LoggerService);
	app.useLogger(customLogger);

	app.enableCors();
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: VERSION_NEUTRAL,
	});
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,

			// Automatically transforms payloads to be objects typed according to their DTO classes
			transform: true,

			transformOptions: {
				enableImplicitConversion: true,
			},
			validationError: {
				target: false,
				value: false,
			},
			exceptionFactory: (errors) => {
				// Customize the error response format
				const messages = errors.map(
					(error) => `${Object.values(error.constraints).join(', ')}`,
				);
				return new BadRequestException({
					statusCode: 400,
					error: messages,
				});
			},
		}),
	);
	// Register interceptors
	// Note: Interceptors execute in reverse order for responses
	// So ResponseInterceptor runs first (converts SuccessResponse to plain object)
	// Then I18nResponseInterceptor runs second (translates the message)
	const i18nService = app.get(I18nService);
	app.useGlobalInterceptors(
		new ResponseInterceptor(),
		new I18nResponseInterceptor(i18nService)
	);

	// Register global exception filter for i18n error translation
	app.useGlobalFilters(new I18nExceptionFilter());

	// Configure Swagger
	const config = new DocumentBuilder()
		.setTitle('UBI Beneficiary API')
		.setDescription('API documentation for UBI Beneficiary')
		.setVersion('1.0')
		.addTag('Auth')
		.addTag('Admin')
		.addTag('Custom Fields')
		.addTag('Content')
		.addTag('Users')
		.addTag('Network API')
		.addTag('Housekeeping')
		.addServer('/api')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				description: 'Enter your Bearer token in the format: Bearer {token}',
			},
			'access-token',
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);
	// Route for Swagger UI
	SwaggerModule.setup('/docs', app, document);

	// Increase the request body size limit
	app.use(bodyParser.json({ limit: '50mb' }));
	app.use(
		bodyParser.urlencoded({
			limit: '50mb',
			extended: true,
		}),
	);

	await app.listen(process.env.PORT);
}
bootstrap();
