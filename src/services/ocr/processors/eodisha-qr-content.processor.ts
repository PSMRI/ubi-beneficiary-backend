import { Injectable } from '@nestjs/common';
import { BaseQRContentProcessor } from './base-qr-content.processor';
import { QRProcessingResult, QRContentType } from '../services/qr-content-processor.service';

@Injectable()
export class EOdishaQRContentProcessor extends BaseQRContentProcessor {
  
  getIssuerName(): string {
    return 'eodisha';
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

  // Override TEXT_AND_URL processing for eOdisha-specific logic
  protected async processTextAndUrlContent(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    this.logger.log(`eOdisha: Processing TEXT_AND_URL (specialized implementation)`);
    return await this.processEOdishaTextAndUrl(qrContent, contentType, documentConfig);
  }

  // eOdisha-specific implementation for TEXT_AND_URL
  private async processEOdishaTextAndUrl(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    try {
      // eOdisha might have different QR format, e.g., comma-separated or different delimiters
      let url: string;
      let textPart: string;
      let detectedDelimiter: string;

      // Check if eOdisha uses specific delimiters
      if (qrContent.includes('|')) {
        // eOdisha might use pipe delimiter
        const parts = qrContent.split('|');
        textPart = parts[0]?.trim() || '';
        url = parts[1]?.trim() || '';
        detectedDelimiter = 'pipe';
      } else if (qrContent.includes(',')) {
        // eOdisha might use comma delimiter
        const parts = qrContent.split(',');
        textPart = parts[0]?.trim() || '';
        url = parts[1]?.trim() || '';
        detectedDelimiter = 'comma';
      } else {
        // Fallback to regex extraction
        const urlRegex = /https?:\/\/[^\s]+/i;
        const urlMatch = urlRegex.exec(qrContent);

        if (!urlMatch) {
          throw new Error('No URL found in eOdisha QR content');
        }

        url = urlMatch[0];
        textPart = qrContent.replace(urlRegex, '').trim();
        detectedDelimiter = 'regex';
      }

      if (!url) {
        throw new Error('No valid URL found in eOdisha QR content');
      }

      // eOdisha-specific validation
      if (documentConfig?.eodishaSpecificValidation) {
        // Add any eOdisha-specific validation logic here
      }

      const validatedUrl = new URL(url);
      
      // Check if URL matches eOdisha domain patterns (if required)
      if (documentConfig?.validateEOdishaDomain && !this.isValidEOdishaUrl(validatedUrl.href)) {
        throw new Error('URL does not match eOdisha domain requirements');
      }

      // eOdisha might require specific headers or authentication
      const downloadResult = await this.downloadWithEOdishaHeaders(validatedUrl.href, documentConfig);

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          text: textPart,
          url: validatedUrl.href,
          issuerType: 'eodisha',
          // Add eOdisha-specific metadata
          eodishaMetadata: {
            processedAt: new Date().toISOString(),
            documentSource: 'eodisha_qr',
            delimiter: detectedDelimiter,
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

  private isValidEOdishaUrl(url: string): boolean {
    // Add eOdisha-specific URL validation logic here
    const eodishaPatterns = [
      'odisha',
      'eodisha',
      'gov.in',
      // Add more eOdisha-specific URL patterns as needed
    ];
    
    return eodishaPatterns.some(pattern => url.toLowerCase().includes(pattern.toLowerCase()));
  }

  private async downloadWithEOdishaHeaders(url: string, documentConfig?: any) {
    // eOdisha might require specific headers or authentication
    // For now, use the standard download method, but this can be extended
    this.logger.log('Downloading document with eOdisha-specific configuration');
    
    // If eOdisha requires specific headers, you can modify this method
    // Example:
    // if (documentConfig?.eodishaAuthToken) {
    //   return this.qrCodeDetector.downloadFromUrlWithHeaders(url, {
    //     'Authorization': `Bearer ${documentConfig.eodishaAuthToken}`,
    //     'X-eOdisha-Client': 'beneficiary-app'
    //   });
    // }
    
    return this.qrCodeDetector.downloadFromUrl(url);
  }
}
