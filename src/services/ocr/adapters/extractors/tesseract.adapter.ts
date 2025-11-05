import { Logger } from '@nestjs/common';
import { ITextExtractor, ExtractedText } from '../../interfaces/text-extractor.interface';
import { createWorker, Worker } from 'tesseract.js';

export class TesseractAdapter implements ITextExtractor {
  private readonly logger = new Logger(TesseractAdapter.name);
  private worker: Worker | null = null;

  constructor() {
    this.logger.log('Tesseract adapter initialized');
  }

  private async ensureWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker('eng');
      this.logger.log('Tesseract worker initialized successfully');
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.ensureWorker();
      return true;
    } catch (error) {
      this.logger.error(`Tesseract validation error: ${error.message}`);
      throw new Error('Failed to validate Tesseract setup.');
    }
  }

  async validatePermissions(): Promise<boolean> {
    return this.validate();
  }

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText> {
    const startTime = Date.now();
    this.logger.log(`Starting text extraction for file type: ${mimeType}`);

    try {
      await this.ensureWorker();

      const { data: { text } } = await this.worker!.recognize(fileBuffer);

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Text extraction completed in ${processingTime}ms with ${text.length} characters extracted`
      );
      
      return {
        fullText: text.trim(),
        confidence: 90, // Assumed high confidence
        metadata: {
          provider: 'tesseract',
          processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Tesseract extraction failed: ${error.message}`);
      throw new Error('Failed to extract text using Tesseract.');
    }
  }

  supportsFileType(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    return supportedTypes.includes(mimeType.toLowerCase());
  }

  getProviderName(): string {
    return 'tesseract';
  }
}
