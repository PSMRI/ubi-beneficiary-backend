import { Injectable } from '@nestjs/common';
import { BaseQRContentProcessor } from './base-qr-content.processor';
import { QRProcessingResult, QRContentType } from '../services/qr-content-processor.service';

@Injectable()
export class JharsevaQRContentProcessor extends BaseQRContentProcessor {
  
  getIssuerName(): string {
    return 'jharseva';
  }
  
  getSupportedContentTypes(): QRContentType[] {
    return [
      QRContentType.TEXT_AND_URL,
      QRContentType.PLAIN_TEXT,
      QRContentType.XML_URL,
      QRContentType.XML,
      QRContentType.JSON_URL,
      QRContentType.JSON,
    ];
  }

  async processQRContent(
    qrContent: string, 
    contentType: string, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    try {
      const qrType = contentType as QRContentType;
      
      switch (qrType) {
        case QRContentType.TEXT_AND_URL:
          this.logger.log(`Jharseva: Processing TEXT_AND_URL (specialized implementation)`);
          return await this.processJharsevaTextAndUrl(qrContent, qrType, documentConfig);

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

        // Unimplemented methods - return error message
        case QRContentType.DOC_URL:
          this.logger.warn(`Jharseva: ${contentType} not implemented for this issuer`);
          return this.createUnsupportedMethodError(qrContent, qrType, 'DOC_URL');

        case QRContentType.VC_URL:
          this.logger.warn(`Jharseva: ${contentType} not implemented for this issuer`);
          return this.createUnsupportedMethodError(qrContent, qrType, 'VC_URL');

        default:
          throw new Error(`Unsupported QR content type for Jharseva: ${contentType}`);
      }
    } catch (error) {
      this.logger.error(`Jharseva processing failed: ${error.message}`, error.stack);
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType: contentType as QRContentType,
        error: `Jharseva processing failed: ${error.message}`,
        errorType: 'PROCESSING_ERROR',
        technicalError: error.message,
      };
    }
  }

  // Jharseva-specific implementation for TEXT_AND_URL
  private async processJharsevaTextAndUrl(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    try {
      // Extract URL from content using regex - Jharseva might have specific URL patterns
      const urlRegex = /https?:\/\/[^\s]+/i;
      const urlMatch = urlRegex.exec(qrContent);

      if (!urlMatch) {
        throw new Error('No URL found in Jharseva QR content');
      }

      const url = urlMatch[0];
      const textPart = qrContent.replace(urlRegex, '').trim();

      // Jharseva-specific validation
      if (documentConfig?.jharsevaSpecificValidation) {
        // Add any Jharseva-specific validation logic here
      }

      const validatedUrl = new URL(url);
      
      // Check if URL matches Jharseva domain patterns (if required)
      if (documentConfig?.validateJharsevaDomain && !this.isValidJharsevaUrl(validatedUrl.href)) {
        throw new Error('URL does not match Jharseva domain requirements');
      }

      // Download document from URL
      const downloadResult = await this.qrCodeDetector.downloadFromUrl(validatedUrl.href);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          text: textPart,
          url: validatedUrl.href,
          issuerType: 'jharseva',
          // Add Jharseva-specific metadata
          jharsevaMetadata: {
            processedAt: new Date().toISOString(),
            documentSource: 'jharseva_qr',
            processingMethod: 'TEXT_AND_URL_SPECIALIZED',
          },
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

  private isValidJharsevaUrl(url: string): boolean {
    // Add Jharseva-specific URL validation logic here
    // For example, check if URL contains jharseva domain or specific patterns
    const jharsevaPatterns = [
      'jharseva',
      'gov.in',
      // Add more Jharseva-specific URL patterns as needed
    ];
    
    return jharsevaPatterns.some(pattern => url.toLowerCase().includes(pattern.toLowerCase()));
  }
}
