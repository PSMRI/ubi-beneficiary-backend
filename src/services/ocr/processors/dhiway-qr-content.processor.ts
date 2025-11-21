import { Injectable } from '@nestjs/common';
import { BaseQRContentProcessor } from './base-qr-content.processor';
import { QRProcessingResult, QRContentType } from '../services/qr-content-processor.service';
import axios from 'axios';

@Injectable()
export class DhiwayQRContentProcessor extends BaseQRContentProcessor {
  
  getIssuerName(): string {
    return 'dhiway';
  }
  
  getSupportedContentTypes(): QRContentType[] {
    return [
      QRContentType.VC_URL,
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
        case QRContentType.VC_URL:
          this.logger.log(`Dhiway: Processing VC_URL (specialized implementation)`);
          return await this.processDhiwayVcUrl(qrContent, qrType, documentConfig);

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
          this.logger.warn(`Dhiway: ${contentType} not implemented for this issuer`);
          return this.createUnsupportedMethodError(qrContent, qrType, 'DOC_URL');

        case QRContentType.TEXT_AND_URL:
          this.logger.warn(`Dhiway: ${contentType} not implemented for this issuer`);
          return this.createUnsupportedMethodError(qrContent, qrType, 'TEXT_AND_URL');

        default:
          throw new Error(`Unsupported QR content type for Dhiway: ${contentType}`);
      }
    } catch (error) {
      this.logger.error(`Dhiway processing failed: ${error.message}`, error.stack);
      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType: contentType as QRContentType,
        error: `Dhiway processing failed: ${error.message}`,
        errorType: 'PROCESSING_ERROR',
        technicalError: error.message,
      };
    }
  }

  // Dhiway-specific implementation for VC_URL
  private async processDhiwayVcUrl(
    qrContent: string, 
    contentType: QRContentType, 
    documentConfig?: any
  ): Promise<QRProcessingResult> {
    try {
      // Validate that QR content is a URL
      const originalUrl = new URL(qrContent.trim());
      
      // Dhiway VC URLs might have specific patterns or requirements
      if (documentConfig?.validateDhiwayVcUrl && !this.isValidDhiwayVcUrl(originalUrl.href)) {
        throw new Error('URL does not match Dhiway VC URL requirements');
      }

      // Dhiway-specific logic: Append .vc to the URL to get the actual VC JSON data
      const vcDataUrl = `${originalUrl.href}.vc`;
      this.logger.log(`Dhiway: Appending .vc to URL - Original: ${originalUrl.href} -> VC API URL: ${vcDataUrl}`);

      // Make GET API call to fetch VC JSON data
      const vcJsonResponse = await this.fetchDhiwayVcJson(vcDataUrl, documentConfig);

      // Parse and validate the VC JSON data
      let vcData = null;
      let vcFormat: string;
      
      try {
        vcData = vcJsonResponse;
        
        // Validate VC structure (basic validation)
        if (vcData && (vcData.type || vcData['@type'] || vcData.credentialSubject)) {
          vcFormat = 'json-ld';
          this.logger.log(`Dhiway: Successfully fetched VC data from ${vcDataUrl}`);
        } else {
          vcFormat = 'json';
          this.logger.log(`Dhiway: Fetched JSON data but no standard VC structure detected`);
        }
      } catch (parseError) {
        this.logger.error(`Dhiway: Failed to process VC JSON from ${vcDataUrl}: ${parseError.message}`);
        throw new Error(`Failed to process VC JSON data: ${parseError.message}`);
      }

      return {
        qrCodeDetected: true,
        qrCodeContent: qrContent,
        contentType,
        processedData: {
          originalUrl: originalUrl.href,
          vcDataUrl: vcDataUrl,
          vcData: vcData,
          issuerType: 'dhiway',
          // Add Dhiway-specific metadata
          dhiwayMetadata: {
            processedAt: new Date().toISOString(),
            documentSource: 'dhiway_vc_qr',
            vcFormat: vcFormat,
            processingMethod: 'VC_URL_SPECIALIZED',
            hasStructuredVcData: !!vcData,
            urlModification: 'appended_.vc',
            apiCall: true,
          },
        },
      };
    } catch (error) {
      return this.handleUrlProcessingError(error, qrContent, contentType);
    }
  }

  private isValidDhiwayVcUrl(url: string): boolean {
    // Validate Dhiway VC URL patterns
    // Expected formats: 
    // - https://dev-uba-bap.tekdinext.com/api/users/fetch-vc-json
    // - https://depwd-verify.digivrtti.com/depwd/1b3389eb-321c-4545-8792-67aa553acae9
    const dhiwayVcPatterns = [
      'fetch-vc-json',     // Specific endpoint pattern
      'tekdinext.com',     // Known Dhiway domain
      'digivrtti.com',     // Dhiway credential domain
      '/depwd/',           // Dhiway credential path
      'dhiway',
      'credential',
      'vc',
      // Add more Dhiway VC-specific URL patterns as needed
    ];
    
    return dhiwayVcPatterns.some(pattern => url.toLowerCase().includes(pattern.toLowerCase()));
  }

  private async fetchDhiwayVcJson(url: string, documentConfig?: any): Promise<any> {
    try {
      // Make simple GET API call to fetch VC JSON data from Dhiway URL
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json, application/ld+json',
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });
      
      // Return the JSON response directly
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch VC JSON from ${url}: ${error.message}`);
      throw new Error(`GET request to Dhiway VC endpoint failed: ${error.message}`);
    }
  }
}
