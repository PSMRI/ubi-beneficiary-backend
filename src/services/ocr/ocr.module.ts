import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OcrService } from './ocr.service';
import { TextExtractorFactory } from './factories/text-extractor.factory';

/**
 * OCR Module - Provides OCR text extraction services
 * Uses adapter pattern to support multiple OCR providers
 * 
 * @Global - Makes OcrService available throughout the application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'TEXT_EXTRACTOR',
      useFactory: (configService: ConfigService) => {
        // Get OCR provider from environment (default to 'aws-textract')
        const provider = configService.get<string>(
          'OCR_PROVIDER',
          'aws-textract',
        );

        // Configure AWS Textract
        const config = {
          region: configService.get<string>('AWS_TEXTRACT_AWS_REGION'),
          credentials: {
            accessKeyId: configService.get<string>('AWS_TEXTRACT_ACCESS_KEY_ID'),
            secretAccessKey: configService.get<string>('AWS_TEXTRACT_SECRET_ACCESS_KEY'),
          },
        };

        // Create and return the appropriate text extractor
        return TextExtractorFactory.create(provider, config);
      },
      inject: [ConfigService],
    },
    OcrService,
  ],
  exports: [OcrService],
})
export class OcrModule {}
