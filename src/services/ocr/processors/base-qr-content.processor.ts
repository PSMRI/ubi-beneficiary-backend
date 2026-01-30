import { Injectable, Logger, Inject } from '@nestjs/common';
import { IQRContentProcessor } from '../interfaces/qr-content-processor.interface';
import { QRProcessingResult, QRContentType } from '../services/qr-content-processor.service';
import { IQRCodeDetector } from '../interfaces/qr-code-detector.interface';

@Injectable()
export abstract class BaseQRContentProcessor implements IQRContentProcessor {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject('QR_CODE_DETECTOR') protected readonly qrCodeDetector: IQRCodeDetector,
  ) {}

  abstract getSupportedContentTypes(): QRContentType[];
  
  abstract getIssuerName(): string;

  // Template method pattern - common processing logic
  async processQRContent(
    qrContent: string, 
    contentType: string, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    try {
      const qrType = contentType as QRContentType;
      
      // Check if content type is supported
      if (!this.canProcess(contentType)) {
        this.logger.warn(`${this.getIssuerName()}: ${contentType} not supported for this issuer`);
        return this.createUnsupportedMethodError(qrContent, qrType, contentType);
      }
      
      switch (qrType) {
        case QRContentType.TEXT_AND_URL:
          return await this.processTextAndUrlContent(qrContent, qrType, documentConfig);

        case QRContentType.PLAIN_TEXT:
          return this.processPlainText(qrContent, qrType);

        case QRContentType.JSON:
          return this.processJson(qrContent, qrType);

        case QRContentType.JSON_URL:
          return await this.processJsonUrl(qrContent, qrType);

        case QRContentType.XML:
          return this.processXml(qrContent, qrType);

        case QRContentType.XML_URL:
          return await this.processXmlUrl(qrContent, qrType);

        case QRContentType.DOC_URL:
          return await this.processDocUrlContent(qrContent, qrType, documentConfig);

        case QRContentType.VC_URL:
          return await this.processVcUrlContent(qrContent, qrType, documentConfig);

        default:
          throw new Error(`Unsupported QR content type for ${this.getIssuerName()}: ${contentType}`);
      }
    } catch (error) {
      return this.createProcessingErrorResult(error, qrContent, contentType);
    }
  }

  // Hook methods for specialized implementations - can be overridden by subclasses
  protected async processTextAndUrlContent(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    return await this.processTextAndUrl(qrContent, contentType);
  }

  protected async processDocUrlContent(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    return await this.processDocUrl(qrContent, contentType);
  }

  protected async processVcUrlContent(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    return await this.processVcUrl(qrContent, contentType);
  }

  canProcess(contentType: string): boolean {
    return this.getSupportedContentTypes().includes(contentType as QRContentType);
  }

  // Common implementations for all adapters
  protected processPlainText(qrContent: string, contentType: QRContentType): QRProcessingResult {
    return {
      qrCodeDetected: true,
      qrCodeContent: qrContent,
      contentType,
      processedData: {
        text: qrContent.trim(),
        issuerType: this.getIssuerName(),
      },
    };
  }

  protected processJson(qrContent: string, contentType: QRContentType): QRProcessingResult {
    try {
      const jsonData = JSON.parse(qrContent);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          ...jsonData,
          issuerType: this.getIssuerName(),
        },
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

  protected async processJsonUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      const jsonData = JSON.parse(qrContent);
      
      if (!jsonData.url) {
        throw new Error('URL field not found in JSON data');
      }

      const url = new URL(jsonData.url);
      
      this.logger.log(`Processing JSON URL: ${url.href}`);

      const downloadResult = await this.qrCodeDetector.downloadFromUrl(url.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          ...jsonData,
          issuerType: this.getIssuerName(),
        },
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

  protected processXml(qrContent: string, contentType: QRContentType): QRProcessingResult {
    try {
      // Basic XML validation - check if it starts with < and ends with >
      const trimmedContent = qrContent.trim();
      if (!trimmedContent.startsWith('<') || !trimmedContent.endsWith('>')) {
        throw new Error('Invalid XML format');
      }

      this.logger.log('Processing XML content');

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          xml: trimmedContent,
          issuerType: this.getIssuerName(),
        },
      };
    } catch (error) {
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        error: `Invalid XML format: ${error.message}`,
        errorType: 'INVALID_XML',
        technicalError: error.message,
      };
    }
  }

  protected async processXmlUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      // Extract URL from XML content or treat content as URL
      let url: string;
      
      if (qrContent.trim().startsWith('<')) {
        // Parse XML to find URL
        const urlRegex1 = /<url>(.*?)<\/url>/i;
        const urlRegex2 = /url=['"]([^'"]*)['"]/i;
        const urlMatch = urlRegex1.exec(qrContent) || urlRegex2.exec(qrContent);
        if (!urlMatch?.[1]) {
          throw new Error('No URL found in XML content');
        }
        url = urlMatch[1];
      } else {
        // Treat content as direct URL
        url = qrContent.trim();
      }

      const validatedUrl = new URL(url);
      this.logger.log(`Processing XML URL: ${validatedUrl.href}`);

      const downloadResult = await this.qrCodeDetector.downloadFromUrl(validatedUrl.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          url: validatedUrl.href,
          issuerType: this.getIssuerName(),
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

  protected handleUrlProcessingError(error: any, qrContent: string, contentType: QRContentType): QRProcessingResult {
    let errorType = 'UNKNOWN_ERROR';
    let errorKey = 'QR_TEXT_AND_URL_NO_URL';

    const errorMessage = error.message || '';
    const hasInvalidUrl = (error.name === 'TypeError' && errorMessage.includes('Invalid URL')) ||
                          errorMessage.includes('Invalid URL format') ||
                          errorMessage.includes('Invalid URL') ||
                          errorMessage.includes('No URL found') ||
                          errorMessage.includes('No valid URL');

    if (hasInvalidUrl) {
      errorType = 'INVALID_URL';
      errorKey = 'QR_TEXT_AND_URL_NO_URL';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = 'NETWORK_ERROR';
    } else if (error.response?.status === 404) {
      errorType = 'DOCUMENT_NOT_FOUND';
    } else if (error.response?.status === 403) {
      errorType = 'ACCESS_DENIED';
    } else if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      errorType = 'TIMEOUT';
      errorKey = 'QR_TEXT_AND_URL_NO_URL';
    }

    this.logger.error(`URL processing failed: ${errorKey}`, error.stack);

    return {
      qrCodeDetected: true,
      qrCodeContent: qrContent,
      contentType,
      error: errorKey,
      errorType,
      technicalError: error.message,
    };
  }

  protected createUnsupportedMethodError(qrContent: string, contentType: QRContentType, methodName: string): QRProcessingResult {
    const errorMessage = `${methodName} processing is not implemented for ${this.getIssuerName()} issuer`;

    return {
      qrCodeDetected: true,
      qrCodeContent: qrContent,
      contentType,
      error: errorMessage,
      errorType: 'UNSUPPORTED_METHOD',
    };
  }

  protected createProcessingErrorResult(error: any, qrContent: string, contentType: string): QRProcessingResult {
    this.logger.error(`${this.getIssuerName()} processing failed: ${error.message}`, error.stack);
    return {
      qrCodeDetected: true,
      qrCodeContent: qrContent,
      contentType: contentType as QRContentType,
      error: `${this.getIssuerName()} processing failed: ${error.message}`,
      errorType: 'PROCESSING_ERROR',
      technicalError: error.message,
    };
  }

  /**
   * Validate that buffer contains actual PDF content using magic bytes
   * This prevents HTML or other files masquerading as PDFs
   */
  protected validatePdfContent(buffer: Buffer): { isValid: boolean; detectedType?: string } {
    if (!buffer || buffer.length < 4) {
      return { isValid: false, detectedType: 'empty_or_too_small' };
    }

    const firstBytes = buffer.subarray(0, 8);

    // PDF signature: %PDF (hex: 25504446)
    if (
      firstBytes[0] === 0x25 &&
      firstBytes[1] === 0x50 &&
      firstBytes[2] === 0x44 &&
      firstBytes[3] === 0x46
    ) {
      return { isValid: true };
    }

    // Check for HTML content (starts with <!DOCTYPE, <html, or <HTML)
    const bufferStart = buffer.subarray(0, Math.min(100, buffer.length)).toString('utf-8').trim();
    if (
      bufferStart.startsWith('<!DOCTYPE') ||
      bufferStart.startsWith('<!doctype') ||
      bufferStart.startsWith('<html') ||
      bufferStart.startsWith('<HTML')
    ) {
      return { isValid: false, detectedType: 'text/html' };
    }

    // Check for XML content
    if (bufferStart.startsWith('<?xml') || bufferStart.startsWith('<?XML')) {
      return { isValid: false, detectedType: 'application/xml' };
    }

    // Check for JSON content
    if (bufferStart.startsWith('{') || bufferStart.startsWith('[')) {
      return { isValid: false, detectedType: 'application/json' };
    }

    return { isValid: false, detectedType: 'unknown' };
  }

  // Default implementations for common content types
  protected async processTextAndUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      // Check if qrContent contains URL (catches invalid QR codes like base64 strings)
      const lowerContent = qrContent.toLowerCase();
      if (!lowerContent.includes('http://') && !lowerContent.includes('https://')) {
        return {
          qrCodeDetected: true,
          qrCodeContent: qrContent,
          contentType,
          error: 'QR_TEXT_AND_URL_NO_URL',
          errorType: 'INVALID_QR_CONTENT',
        };
      }

      // Extract URL from content using regex
      const urlRegex = /https?:\/\/[^\s<>"']+/i;
      const urlMatch = urlRegex.exec(qrContent);
      
      if (!urlMatch) {
        return {
          qrCodeDetected: true,
          qrCodeContent: qrContent,
          contentType,
          error: 'QR_TEXT_AND_URL_NO_URL',
          errorType: 'INVALID_QR_CONTENT',
        };
      }

      const url = urlMatch[0].trim();
      const textPart = qrContent.replace(urlRegex, '').trim();

      // Validate URL format
      let validatedUrl: URL;
      try {
        validatedUrl = new URL(url);
      } catch {
        return {
          qrCodeDetected: true,
          qrCodeContent: qrContent,
          contentType,
          error: 'QR_TEXT_AND_URL_NO_URL',
          errorType: 'INVALID_QR_CONTENT',
        };
      }
      
      // Download document from URL
      const downloadResult = await this.qrCodeDetector.downloadFromUrl(validatedUrl.href);

      // Validate downloaded file is PDF
      const normalizedMimeType = downloadResult.mimeType.toLowerCase().trim();
      if (normalizedMimeType !== 'application/pdf') {
        return {
          qrCodeDetected: true,
          qrCodeContent: qrContent,
          contentType,
          error: 'QR_TEXT_AND_URL_NO_URL',
          errorType: 'INVALID_FILE_TYPE',
          technicalError: downloadResult.mimeType,
        };
      }

      // Validate actual file content using magic bytes to catch HTML/other files masquerading as PDFs
      const contentValidation = this.validatePdfContent(downloadResult.buffer);
      if (!contentValidation.isValid) {
        return {
          qrCodeDetected: true,
          qrCodeContent: qrContent,
          contentType,
          error: 'QR_TEXT_AND_URL_NO_URL',
          errorType: 'INVALID_FILE_TYPE',
          technicalError: contentValidation.detectedType || downloadResult.mimeType,
        };
      }

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          text: textPart,
          url: validatedUrl.href,
          issuerType: this.getIssuerName(),
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

  protected async processDocUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
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
        processedData: { 
          url: url.href,
          issuerType: this.getIssuerName(),
        },
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

  protected async processVcUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      const url = new URL(qrContent.trim());
      this.logger.log(`Processing VC URL: ${url.href}`);

      const downloadResult = await this.qrCodeDetector.downloadFromUrl(url.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: { 
          vcUrl: url.href,
          issuerType: this.getIssuerName(),
        },
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
}
