import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OcrService } from './ocr.service';
import { TextExtractorFactory } from './factories/text-extractor.factory';
import { QRCodeDetectorService } from './services/qr-code-detector.service';
import { QRProcessingService } from './services/qr-processing.service';
import { QRContentProcessorService } from './services/qr-content-processor.service';
import { AdminModule } from '@modules/admin/admin.module';
import { QRScanningService } from '../qr/qr-scanning.service';

/**
 * OCR Module - Provides OCR text extraction services with QR code processing
 * Uses adapter pattern to support multiple OCR providers
 * 
 * @Global - Makes OcrService available throughout the application
 */
@Global()
@Module({
  imports: [ConfigModule, AdminModule],
  providers: [
    {
      provide: 'TEXT_EXTRACTOR',
      useFactory: (configService: ConfigService) => {
        // Get OCR provider from environment (default to 'aws-textract')
        const provider = configService.get<string>(
          'OCR_PROVIDER',
          'aws-textract',
        );

        let config: any;

        // Configure based on provider
        if (provider === 'google-gemini') {
          // Configure Google Gemini API
          config = {
            apiKey: configService.get<string>('GEMINI_API_KEY'),
          };

          if (!config.apiKey) {
            throw new Error(
              'GEMINI_API_KEY is required when OCR_PROVIDER is set to google-gemini'
            );
          }
        } else if (provider === 'aws-textract') {
          // Configure AWS Textract (default)
          config = {
            region: configService.get<string>('AWS_TEXTRACT_AWS_REGION'),
            credentials: {
              accessKeyId: configService.get<string>('AWS_TEXTRACT_ACCESS_KEY_ID'),
              secretAccessKey: configService.get<string>('AWS_TEXTRACT_SECRET_ACCESS_KEY'),
            },
          };
        } else if (provider === 'tesseract') {
          // Tesseract requires no config
          config = {};
        } else {
          throw new Error(`Unsupported OCR_PROVIDER: ${provider}. Supported: aws-textract, google-gemini, tesseract`);
        }

        // Create and return the appropriate text extractor
        return TextExtractorFactory.create(provider, config);
      },
      inject: [ConfigService],
    },
    {
      provide: 'QR_CODE_DETECTOR',
      useClass: QRCodeDetectorService,
    },
    QRContentProcessorService,
    QRProcessingService,
    QRScanningService, // Added QRScanningService to providers
    OcrService,
  ],
  exports: [OcrService, QRScanningService], // Exporting QRScanningService
})
export class OcrModule {}
