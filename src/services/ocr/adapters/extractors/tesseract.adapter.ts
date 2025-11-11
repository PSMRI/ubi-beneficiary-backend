import { Logger } from '@nestjs/common';
import { ITextExtractor, ExtractedText } from '../../interfaces/text-extractor.interface';
import { createWorker, Worker } from 'tesseract.js';
import { TESSERACT_SUPPORTED_TYPES } from '../../constants/mime-types.constants';
import { handleOcrError } from '../../utils/error-handler.util';

export class TesseractAdapter implements ITextExtractor {
  private readonly logger = new Logger(TesseractAdapter.name);
  private worker: Worker | null = null;

  constructor() {
    this.logger.log('Tesseract OCR adapter initialized');
  }

  private async ensureWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker('eng');
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

    try {
      await this.ensureWorker();
      const { data: { text } } = await this.worker.recognize(fileBuffer);
      const processingTime = Date.now() - startTime;

      this.logger.log(`Tesseract extracted ${text.length} characters in ${processingTime}ms`);
      
      return {
        fullText: text.trim(),
        confidence: 90,
        metadata: {
          provider: 'tesseract',
          processingTime,
        },
      };
    } catch (error) {
      this.logger.error(`Tesseract extraction failed: ${error.message}`);
      handleOcrError(error, 'tesseract');
    }
  }

  supportsFileType(mimeType: string): boolean {
    return TESSERACT_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
  }

  getProviderName(): string {
    return 'tesseract';
  }
}
