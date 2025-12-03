import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface TranslationCache {
    [locale: string]: {
        [category: string]: {
            [key: string]: string;
        };
    };
}

/**
 * I18nService - Centralized service for internationalization
 * Handles translation of both error and success messages
 */
@Injectable()
export class I18nService {
    private translations: TranslationCache = {};
    private readonly defaultLocale = 'en';
    private readonly supportedLocales = ['en', 'hi'];
    private readonly categories = ['errors', 'success'];

    constructor() {
        this.loadTranslations();
    }

    /**
     * Load translations from JSON files for all locales and categories
     */
    private loadTranslations(): void {
        console.log('[I18N Service] Loading translations...');
        console.log('[I18N Service] __dirname:', __dirname);

        this.supportedLocales.forEach((locale) => {
            this.translations[locale] = {};

            this.categories.forEach((category) => {
                try {
                    const filePath = path.join(
                        __dirname,
                        '../../i18n',
                        locale,
                        `${category}.json`,
                    );
                    console.log(`[I18N Service] Loading ${locale}/${category} from:`, filePath);
                    console.log(`[I18N Service] File exists:`, fs.existsSync(filePath));

                    if (!fs.existsSync(filePath)) {
                        console.error(`[I18N Service] File not found at: ${filePath}`);
                        this.translations[locale][category] = {};
                        return;
                    }

                    const content = fs.readFileSync(filePath, 'utf-8');
                    console.log(`[I18N Service] File content length:`, content.length);

                    const parsed = JSON.parse(content);
                    console.log(`[I18N Service] Parsed JSON keys:`, Object.keys(parsed).length);

                    // Filter out comment keys that start with underscore
                    this.translations[locale][category] = Object.keys(parsed)
                        .filter(key => !key.startsWith('_'))
                        .reduce((obj, key) => {
                            obj[key] = parsed[key];
                            return obj;
                        }, {} as { [key: string]: string });

                    console.log(`[I18N Service] Loaded ${Object.keys(this.translations[locale][category]).length} keys for ${locale}/${category}`);
                } catch (error) {
                    console.error(`[I18N Service] Failed to load translations for ${locale}/${category}`, error.message);
                    console.error(`[I18N Service] Error stack:`, error.stack);
                    this.translations[locale][category] = {};
                }
            });
        });
    }

    /**
     * Extract locale from Accept-Language header
     */
    getLocaleFromHeader(acceptLanguage: string | undefined): string {
        const locale = acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase();
        return this.supportedLocales.includes(locale || '') ? locale : this.defaultLocale;
    }

    /**
     * Translate a message key with optional parameters
     * @param key - Translation key (e.g., 'USER_CREATED', 'AUTH_INVALID_OTP')
     * @param locale - Target locale ('en' or 'hi')
     * @param params - Optional parameters for placeholder replacement
     * @param category - Message category ('errors' or 'success')
     */
    translate(
        key: string,
        locale: string,
        params?: Record<string, any>,
        category: 'errors' | 'success' = 'errors'
    ): string {
        console.log('[I18N Service] Translating key:', key, 'for locale:', locale, 'category:', category);

        // Get translation for the locale, fallback to default locale
        let message = this.translations[locale]?.[category]?.[key] ||
            this.translations[this.defaultLocale]?.[category]?.[key] ||
            key;

        console.log('[I18N Service] Translation found:', message);

        // Replace placeholders with parameters
        if (params && typeof message === 'string') {
            Object.keys(params).forEach((paramKey) => {
                const placeholder = `{{${paramKey}}}`;
                message = message.replace(new RegExp(placeholder, 'g'), String(params[paramKey]));
            });
        }

        return message;
    }

    /**
     * Translate an error message
     */
    translateError(key: string, locale: string, params?: Record<string, any>): string {
        return this.translate(key, locale, params, 'errors');
    }

    /**
     * Translate a success message
     */
    translateSuccess(key: string, locale: string, params?: Record<string, any>): string {
        return this.translate(key, locale, params, 'success');
    }

    /**
     * Check if a string is a translation key (uppercase with underscores)
     */
    isTranslationKey(text: string): boolean {
        return typeof text === 'string' && /^[A-Z_]+$/.test(text);
    }

    /**
     * Get all supported locales
     */
    getSupportedLocales(): string[] {
        return [...this.supportedLocales];
    }

    /**
     * Get default locale
     */
    getDefaultLocale(): string {
        return this.defaultLocale;
    }

    /**
     * Reload translations (useful for hot-reload in development)
     */
    reloadTranslations(): void {
        this.translations = {};
        this.loadTranslations();
    }

    /**
     * Translate a message using dot notation key format (e.g., 'validation.FIELDS_NOT_PRESENT')
     * Compatible with NestJS i18n style
     * @param key - Translation key in dot notation (e.g., 'validation.FIELDS_NOT_PRESENT')
     * @param options - Options object containing args for interpolation and optional lang for locale
     * @returns Translated string with interpolated values
     */
    t(key: string, options?: { args?: Record<string, any>; lang?: string }): string {
        const locale = options?.lang || this.defaultLocale;
        const args = options?.args;

        // Parse the dot notation key (e.g., 'validation.FIELDS_NOT_PRESENT')
        // For backward compatibility, we'll still look in errors.json
        const keyParts = key.split('.');
        let translationKey: string;

        if (keyParts.length > 1) {
            // Use the last part as the translation key
            translationKey = keyParts[keyParts.length - 1];
        } else {
            translationKey = key;
        }

        // Get translation from errors category by default
        let message = this.translations[locale]?.['errors']?.[translationKey] ||
            this.translations[this.defaultLocale]?.['errors']?.[translationKey] ||
            key;

        // Replace placeholders with args parameters
        if (args && typeof message === 'string') {
            Object.keys(args).forEach((paramKey) => {
                const placeholder = `{{${paramKey}}}`;
                message = message.replace(new RegExp(placeholder, 'g'), String(args[paramKey]));
            });
        }

        return message;
    }
}



