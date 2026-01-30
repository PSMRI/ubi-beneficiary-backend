import { Injectable, Logger, Inject } from '@nestjs/common';
import { IQRCodeDetector } from '../interfaces/qr-code-detector.interface';
import { QRContentProcessorFactory } from '../factories/qr-content-processor.factory';
import { BaseQRContentProcessor } from '../processors/base-qr-content.processor';

/**
 * Default QR Content Processor for fallback processing
 */
class DefaultQRContentProcessor extends BaseQRContentProcessor {
  getIssuerName(): string {
    return 'default';
  }
  
  getSupportedContentTypes(): QRContentType[] {
    return Object.values(QRContentType);
  }
}

/**
 * Supported QR content types
 */
export enum QRContentType {
  DOC_URL = 'DOC_URL',
  TEXT_AND_URL = 'TEXT_AND_URL',
  PLAIN_TEXT = 'PLAIN_TEXT',
  VC_URL = 'VC_URL',
  JSON = 'JSON',
  JSON_URL = 'JSON_URL',
  XML = 'XML',
  XML_URL = 'XML_URL',
}

/**
 * QR processing result interface
 */
export interface QRProcessingResult {
  qrCodeDetected: boolean;
  qrCodeContent: string | null;
  contentType: QRContentType;
  processedData?: any;
  downloadedDocument?: {
    buffer: Buffer;
    mimeType: string;
    url: string;
  };
  error?: string;
  errorType?: string;
  technicalError?: string;
  isRequired?: boolean; // Indicates if QR processing was required for this document type
}

/**
 * Service for processing different types of QR code content
 * Handles various QR content formats in an extensible way
 */
@Injectable()
export class QRContentProcessorService {
  private readonly logger = new Logger(QRContentProcessorService.name);
  private readonly defaultProcessor: DefaultQRContentProcessor;

  constructor(
    @Inject('QR_CODE_DETECTOR') private readonly qrCodeDetector: IQRCodeDetector,
    private readonly qrContentProcessorFactory?: QRContentProcessorFactory, // Optional for backward compatibility
  ) {
    this.defaultProcessor = new DefaultQRContentProcessor(this.qrCodeDetector);
  }

  /**
   * Process QR code content based on its type
   * @param qrContent - Raw QR code content
   * @param contentType - Expected content type from configuration
   * @param issuer - Issuer type (optional, for adapter-specific processing)
   * @param documentConfig - Document configuration from vcConfiguration (optional)
   * @returns Processing result with extracted data
   */
  async processQRContent(
    qrContent: string, 
    contentType: string, 
    issuer?: string, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    try {
      this.logger.log(`Processing QR content: type='${contentType}', issuer='${issuer || 'default'}'`);

      // If issuer is specified and factory is available, use issuer-specific processor
      if (issuer && this.qrContentProcessorFactory) {
        this.logger.log(`Using adapter mode for issuer: ${issuer}`);
        return await this.qrContentProcessorFactory.processQRContent(
          issuer, 
          qrContent, 
          contentType, 
          documentConfig
        );
      }

      // Fallback to default processor for backward compatibility
      this.logger.log(`Using fallback mode (no issuer or factory not available)`);
      return await this.defaultProcessor.processQRContent(qrContent, contentType, documentConfig);
    } catch (error) {
      this.logger.error(`QR content processing failed: ${error.message}`, error.stack);
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType: contentType as QRContentType,
        error: `Processing failed: ${error.message}`,
        errorType: 'PROCESSING_ERROR',
        technicalError: error.message,
      };
    }
  }









}