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

  // Default implementations for common content types
  protected async processTextAndUrl(qrContent: string, contentType: QRContentType): Promise<QRProcessingResult> {
    try {
      // Extract URL from content using regex
      const urlRegex = /https?:\/\/[^\s]+/i;
      const urlMatch = urlRegex.exec(qrContent);

      if (!urlMatch) {
        throw new Error('No URL found in QR content');
      }

      const url = urlMatch[0];
      const textPart = qrContent.replace(urlRegex, '').trim();

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
