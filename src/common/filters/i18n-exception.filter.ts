import {
    Catch,
    ExceptionFilter,
    HttpException,
    ArgumentsHost,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface TranslationCache {
    [locale: string]: {
        [key: string]: string;
    };
}

@Catch(HttpException)
export class I18nExceptionFilter implements ExceptionFilter {
    private translations: TranslationCache = {};
    private readonly defaultLocale = 'en';
    private readonly supportedLocales = ['en', 'hi'];

    constructor() {
        this.loadTranslations();
    }

    /**
     * Load translations from JSON files
     */
    private loadTranslations(): void {
        this.supportedLocales.forEach((locale) => {
            try {
                const filePath = path.join(
                    __dirname,
                    '../../i18n',
                    locale,
                    'errors.json',
                );
                const content = fs.readFileSync(filePath, 'utf-8');
                this.translations[locale] = JSON.parse(content);
            } catch (error) {
                console.error(`Failed to load translations for locale: ${locale}`, error);
                this.translations[locale] = {};
            }
        });
    }

    /**
     * Get the locale from request headers
     */
    private getLocale(request: Request): string {
        const acceptLanguage = request.headers['accept-language'];
        const locale = acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase();

        // Check if the locale is supported
        return this.supportedLocales.includes(locale || '') ? locale : this.defaultLocale;
    }

    /**
     * Translate a message key with optional parameters
     */
    private translate(key: string, locale: string, params?: Record<string, any>): string {
        // Get translation for the locale, fallback to default locale
        let message = this.translations[locale]?.[key] ||
            this.translations[this.defaultLocale]?.[key] ||
            key;

        // Replace placeholders with parameters
        if (params && typeof message === 'string') {
            Object.keys(params).forEach((paramKey) => {
                const placeholder = `{{${paramKey}}}`;
                message = message.replace(new RegExp(placeholder, 'g'), params[paramKey]);
            });
        }

        return message;
    }

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const locale = this.getLocale(request);

        // Get the exception response
        const exceptionResponse = exception.getResponse();
        let message: string;
        let translatedMessage: string;

        // Handle different response types
        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
            // Check if it's a translation key (uppercase with underscores)
            if (/^[A-Z_]+$/.test(message)) {
                translatedMessage = this.translate(message, locale);
            } else {
                translatedMessage = message;
            }
        } else if (typeof exceptionResponse === 'object') {
            const responseObj = exceptionResponse as any;

            // Handle { key: 'TRANSLATION_KEY', params: {...} } format
            if (responseObj.key) {
                translatedMessage = this.translate(
                    responseObj.key,
                    locale,
                    responseObj.params,
                );
                message = responseObj.key;
            }
            // Handle { message: 'ERROR_MESSAGE' } format
            else if (responseObj.message) {
                message = Array.isArray(responseObj.message)
                    ? responseObj.message[0]
                    : responseObj.message;

                // Check if it's a translation key
                if (typeof message === 'string' && /^[A-Z_]+$/.test(message)) {
                    translatedMessage = this.translate(message, locale);
                } else {
                    translatedMessage = message;
                }
            }
            // Default to the whole response message
            else {
                message = responseObj.error || 'An error occurred';
                translatedMessage = message;
            }
        } else {
            message = 'An error occurred';
            translatedMessage = message;
        }

        // Send the response
        response.status(status).json({
            statusCode: status,
            message: translatedMessage,
            error: translatedMessage,
        });
    }
}


