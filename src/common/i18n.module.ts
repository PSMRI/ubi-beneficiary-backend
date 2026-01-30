import { Global, Module } from '@nestjs/common';
import { I18nService } from './services/i18n.service';

/**
 * I18nModule - Global module for internationalization
 * Makes I18nService available throughout the application
 */
@Global()
@Module({
    providers: [I18nService],
    exports: [I18nService],
})
export class I18nModule {}


