import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Decorator to get the current locale from the request
 * Usage: @I18nLang() lang: string
 */
export const I18nLang = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const acceptLanguage = request.headers['accept-language'];
        const locale = acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase();

        // Default to 'en' if locale is not supported
        const supportedLocales = ['en', 'hi'];
        return supportedLocales.includes(locale || '') ? locale : 'en';
    },
);

/**
 * Helper function to create a success response with translation key
 * @param key - Translation key (e.g., 'USER_CREATED')
 * @param data - Response data
 * @param params - Optional parameters for placeholder replacement
 * @param statusCode - HTTP status code (default: 200)
 */
export function createSuccessResponse(
    key: string,
    data?: any,
    params?: Record<string, any>,
    statusCode: number = 200
) {
    return {
        statusCode,
        message: key, // Will be translated by I18nResponseInterceptor
        data: data || {},
        params, // Will be used for placeholder replacement
    };
}

/**
 * Helper function to create a translated success response with explicit key
 * This ensures the I18nResponseInterceptor processes it correctly
 * @param key - Translation key (e.g., 'USER_CREATED')
 * @param data - Response data
 * @param params - Optional parameters for placeholder replacement
 * @param statusCode - HTTP status code (default: 200)
 */
export function createI18nSuccessResponse(
    key: string,
    data?: any,
    params?: Record<string, any>,
    statusCode: number = 200
) {
    return {
        statusCode,
        key, // Special key property for translation
        data: data || {},
        params, // Will be used for placeholder replacement
    };
}



