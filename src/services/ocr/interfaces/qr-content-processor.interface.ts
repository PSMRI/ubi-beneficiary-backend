import { QRProcessingResult, QRContentType } from '../services/qr-content-processor.service';

export interface IQRContentProcessor {
  /**
   * Process QR content for a specific issuer
   * @param qrContent - Raw QR code content
   * @param contentType - Expected content type from configuration
   * @param documentConfig - Document configuration from vcConfiguration
   * @returns Processing result with extracted data
   */
  processQRContent(
    qrContent: string, 
    contentType: string, 
    documentConfig?: any
  ): Promise<QRProcessingResult>;

  /**
   * Get supported content types for this issuer
   */
  getSupportedContentTypes(): QRContentType[];

  /**
   * Validate if this processor can handle the given content type
   */
  canProcess(contentType: string): boolean;

  /**
   * Get the issuer name for this processor
   */
  getIssuerName(): string;
}
