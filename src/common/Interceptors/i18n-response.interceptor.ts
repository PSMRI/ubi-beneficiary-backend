import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { I18nService } from '../services/i18n.service';

/**
 * I18nResponseInterceptor - Intercepts responses and translates success messages
 * Works with the existing ResponseInterceptor to handle success message translation
 */
@Injectable()
export class I18nResponseInterceptor implements NestInterceptor {
    constructor(private readonly i18nService: I18nService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const locale = this.i18nService.getLocaleFromHeader(request.headers['accept-language']);

        return next.handle().pipe(
            map((data) => {
                // Handle different response formats
                if (data && typeof data === 'object') {
                    // Handle SuccessResponse format { statusCode, message, data }
                    if (data.statusCode && data.message) {
                        const translatedMessage = this.translateMessage(
                            data.message,
                            locale,
                            data.params
                        );

                        return {
                            ...data,
                            message: translatedMessage,
                        };
                    }

                    // Handle format with 'key' and 'params' for translation
                    if (data.key) {
                        const translatedMessage = this.i18nService.translateSuccess(
                            data.key,
                            locale,
                            data.params
                        );

                        return {
                            ...data,
                            message: translatedMessage,
                            key: undefined, // Remove key from response
                            params: undefined, // Remove params from response
                        };
                    }

                    // Handle nested message in data object
                    if (data.data && typeof data.data === 'object' && data.data.message) {
                        const translatedMessage = this.translateMessage(
                            data.data.message,
                            locale,
                            data.data.params
                        );

                        return {
                            ...data,
                            data: {
                                ...data.data,
                                message: translatedMessage,
                            },
                        };
                    }
                }

                // Pass through if no translation needed
                return data;
            })
        );
    }

    /**
     * Translate a message if it's a translation key
     */
    private translateMessage(message: string, locale: string, params?: Record<string, any>): string {
        try {
            // Check if message is a translation key (uppercase with underscores)
            if (message && this.i18nService.isTranslationKey(message)) {
                return this.i18nService.translateSuccess(message, locale, params);
            }

            // Return as-is if not a translation key
            return message;
        } catch (error) {
            // If translation fails, return original message
            console.error('I18nResponseInterceptor: Translation error', error);
            return message;
        }
    }
}



