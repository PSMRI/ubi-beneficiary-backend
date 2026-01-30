import { Injectable, Logger } from '@nestjs/common';
import { IQRContentProcessor } from '../interfaces/qr-content-processor.interface';
import { JharsevaQRContentProcessor } from '../processors/jharseva-qr-content.processor';
import { EOdishaQRContentProcessor } from '../processors/eodisha-qr-content.processor';
import { DhiwayQRContentProcessor } from '../processors/dhiway-qr-content.processor';
import { QRProcessingResult } from '../services/qr-content-processor.service';

@Injectable()
export class QRContentProcessorFactory {
  private readonly logger = new Logger(QRContentProcessorFactory.name);

  constructor(
    private readonly jharsevaQRProcessor: JharsevaQRContentProcessor,
    private readonly eodishaQRProcessor: EOdishaQRContentProcessor,
    private readonly dhiwayQRProcessor: DhiwayQRContentProcessor,
  ) {}

  /**
   * Get the appropriate QR content processor based on issuer type
   * @param issuer - Issuer type (e.g., 'jharseva', 'eodisha', 'dhiway')
   * @returns QR content processor implementation
   */
  getProcessor(issuer: string): IQRContentProcessor | null {
    const normalizedIssuer = issuer?.toLowerCase().trim();

    switch (normalizedIssuer) {
      case 'jharseva':
        this.logger.log(`QR Processor: Using JharsevaQRContentProcessor for issuer '${issuer}'`);
        return this.jharsevaQRProcessor;

      case 'eodisha':
        this.logger.log(`QR Processor: Using EOdishaQRContentProcessor for issuer '${issuer}'`);
        return this.eodishaQRProcessor;

      case 'dhiway':
        this.logger.log(`QR Processor: Using DhiwayQRContentProcessor for issuer '${issuer}'`);
        return this.dhiwayQRProcessor;

      default:
        this.logger.warn(`QR Processor: No processor found for issuer '${issuer}'. Available: jharseva, eodisha, dhiway`);
        return null;
    }
  }

  /**
   * Get all available processors
   * @returns Array of all QR content processors
   */
  getAllProcessors(): IQRContentProcessor[] {
    return [
      this.jharsevaQRProcessor,
      this.eodishaQRProcessor,
      this.dhiwayQRProcessor,
    ];
  }

  /**
   * Get processors that support a specific content type
   * @param contentType - Content type to check support for
   * @returns Array of processors that support the content type
   */
  getProcessorsByContentType(contentType: string): IQRContentProcessor[] {
    return this.getAllProcessors().filter(processor => 
      processor.canProcess(contentType)
    );
  }

  /**
   * Process QR content using the appropriate processor
   * @param issuer - Issuer type
   * @param qrContent - Raw QR code content
   * @param contentType - Expected content type from configuration
   * @param documentConfig - Document configuration from vcConfiguration
   * @returns Processing result with extracted data
   */
  async processQRContent(
    issuer: string,
    qrContent: string,
    contentType: string,
    documentConfig?: any,
  ): Promise<QRProcessingResult> {
    const processor = this.getProcessor(issuer);

    if (!processor) {
      this.logger.error(`No QR processor available for issuer: ${issuer}`);
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType: contentType as any,
        error: `No QR processor available for issuer: ${issuer}`,
        errorType: 'UNSUPPORTED_ISSUER',
      };
    }

    if (!processor.canProcess(contentType)) {
      this.logger.error(`Issuer '${issuer}' does not support content type '${contentType}'. Supported: ${processor.getSupportedContentTypes().join(', ')}`);
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType: contentType as any,
        error: `Issuer ${issuer} does not support content type: ${contentType}`,
        errorType: 'UNSUPPORTED_CONTENT_TYPE',
      };
    }

    try {
      return await processor.processQRContent(qrContent, contentType, documentConfig);
    } catch (error) {
      this.logger.error(`QR processing failed for ${processor.getIssuerName()}: ${error.message}`, error.stack);
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType: contentType as any,
        error: `QR processing failed: ${error.message}`,
        errorType: 'PROCESSING_ERROR',
        technicalError: error.message,
      };
    }
  }
}
