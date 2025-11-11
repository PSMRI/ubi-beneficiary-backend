import { Injectable, Logger, Inject } from '@nestjs/common';
import { IQRCodeDetector } from '../interfaces/qr-code-detector.interface';

/**
 * Supported QR content types
 */
export enum QRContentType {
  DOC_URL = 'DOC_URL',
  TEXT_AND_URL = 'TEXT_AND_URL',
  PLAIN_TEXT = 'PLAIN_TEXT',
  JSON = 'JSON',
  JSON_URL = 'JSON_URL',
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

  constructor(
    @Inject('QR_CODE_DETECTOR') private readonly qrCodeDetector: IQRCodeDetector,
  ) {}

  /**
   * Process QR code content based on its type
   * @param qrContent - Raw QR code content
   * @param contentType - Expected content type from configuration
   * @returns Processing result with extracted data
   */
  async processQRContent(qrContent: string, contentType: string): Promise<QRProcessingResult> {
    try {
      this.logger.log(`Processing QR content of type: ${contentType}`);
      this.logger.debug(`QR content preview: ${qrContent.substring(0, 200)}...`);

      const qrType = contentType as QRContentType;
      
      switch (qrType) {
        case QRContentType.DOC_URL:
          return await this.processDocUrl(qrContent, qrType);

        case QRContentType.TEXT_AND_URL:
          return await this.processTextAndUrl(qrContent, qrType);

        case QRContentType.PLAIN_TEXT:
          return this.processPlainText(qrContent, qrType);

        case QRContentType.JSON:
          return this.processJson(qrContent, qrType);

        case QRContentType.JSON_URL:
          return await this.processJsonUrl(qrContent, qrType);

        default:
          this.logger.warn(`Unsupported QR content type: ${contentType}`);
          return {
            qrCodeDetected: true,
            qrCodeContent: qrContent,
            contentType: qrType,
            error: `Unsupported QR content type: ${contentType}`,
            errorType: 'UNSUPPORTED_TYPE',
          };
      }
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

  /**
   * Process QR content that contains only a document URL
   */
  private async processDocUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      // Validate that QR content is a URL
      const url = new URL(qrContent.trim());
      
      this.logger.log(`Processing document URL: ${url.href}`);

      // Download document from URL
      const downloadResult = await this.qrCodeDetector.downloadFromUrl(url.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: { url: url.href },
        downloadedDocument: {
          buffer: downloadResult.buffer,
          mimeType: downloadResult.mimeType,
          url: url.href,
        },
      };
    } catch (error) {
      return this.handleUrlProcessingError(error, qrContent, contentType);
    }
  }

  /**
   * Process QR content that contains both text and URL
   * Format: "TEXT https://example.com/document"
   */
  private async processTextAndUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      // Extract URL from content using regex
      const urlRegex = /https?:\/\/[^\s]+/i;
      const urlMatch = urlRegex.exec(qrContent);

      if (!urlMatch) {
        throw new Error('No URL found in QR content');
      }

      const url = urlMatch[0];
      const textPart = qrContent.replace(urlRegex, '').trim();

      this.logger.log(`Extracted URL: ${url}`);
      this.logger.log(`Extracted text: ${textPart.substring(0, 100)}...`);

      // Validate and process URL
      const validatedUrl = new URL(url);
      
      // Download document from URL
      const downloadResult = await this.qrCodeDetector.downloadFromUrl(validatedUrl.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          text: textPart,
          url: validatedUrl.href,
        },
        downloadedDocument: {
          buffer: downloadResult.buffer,
          mimeType: downloadResult.mimeType,
          url: validatedUrl.href,
        },
      };
    } catch (error) {
      return this.handleUrlProcessingError(error, qrContent, contentType);
    }
  }

  /**
   * Process QR content that contains only plain text
   */
  private processPlainText(qrContent: string, contentType: QRContentType): QRProcessingResult {
    return {
      qrCodeDetected: true,
      qrCodeContent: qrContent,
      contentType,
      processedData: {
        text: qrContent.trim(),
      },
    };
  }

  /**
   * Process QR content that contains JSON data
   */
  private processJson(qrContent: string, contentType: QRContentType): QRProcessingResult {
    try {
      const jsonData = JSON.parse(qrContent);
      
      this.logger.log(`Parsed JSON data with keys: ${Object.keys(jsonData).join(', ')}`);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: jsonData,
      };
    } catch (error) {
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        error: `Invalid JSON format: ${error.message}`,
        errorType: 'INVALID_JSON',
        technicalError: error.message,
      };
    }
  }

  /**
   * Process QR content that contains JSON with a URL field
   * Expected format: {"url": "https://example.com/document", "metadata": {...}}
   */
  private async processJsonUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      const jsonData = JSON.parse(qrContent);
      
      if (!jsonData.url) {
        throw new Error('URL field not found in JSON data');
      }

      const url = new URL(jsonData.url);
      
      this.logger.log(`Processing JSON URL: ${url.href}`);
      this.logger.log(`JSON metadata: ${JSON.stringify(jsonData, null, 2)}`);

      // Download document from URL
      const downloadResult = await this.qrCodeDetector.downloadFromUrl(url.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: jsonData,
        downloadedDocument: {
          buffer: downloadResult.buffer,
          mimeType: downloadResult.mimeType,
          url: url.href,
        },
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          qrCodeDetected: true,
          qrCodeContent: qrContent,
          contentType,
          error: `Invalid JSON format: ${error.message}`,
          errorType: 'INVALID_JSON',
          technicalError: error.message,
        };
      }
      return this.handleUrlProcessingError(error, qrContent, contentType);
    }
  }

  /**
   * Handle URL processing errors with detailed error types
   */
  private handleUrlProcessingError(error: any, qrContent: string, contentType: QRContentType): QRProcessingResult {
    let errorType = 'UNKNOWN_ERROR';
    let userMessage = 'Failed to process document URL';

    if (error.name === 'TypeError' && error.message.includes('Invalid URL')) {
      errorType = 'INVALID_URL';
      userMessage = 'QR code does not contain a valid URL';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = 'NETWORK_ERROR';
      userMessage = 'Could not connect to the document URL';
    } else if (error.response?.status === 404) {
      errorType = 'DOCUMENT_NOT_FOUND';
      userMessage = 'Document not found at the provided URL';
    } else if (error.response?.status === 403) {
      errorType = 'ACCESS_DENIED';
      userMessage = 'Access denied to the document URL';
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT';
      userMessage = 'Document download timed out';
    }

    this.logger.error(`URL processing failed: ${userMessage}`, error.stack);

    return {
      qrCodeDetected: true,
      qrCodeContent: qrContent,
      contentType,
      error: userMessage,
      errorType,
      technicalError: error.message,
    };
  }
}