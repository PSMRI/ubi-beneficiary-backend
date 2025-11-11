import { Injectable, Logger, Inject } from '@nestjs/common';
import { IQRCodeDetector, DocumentConfig } from '../interfaces/qr-code-detector.interface';
import { AdminService } from '@modules/admin/admin.service';
import { QRContentProcessorService, QRProcessingResult } from './qr-content-processor.service';
import { QRScanningService } from '../../qr/qr-scanning.service';

/**
 * Service for processing QR codes in documents
 * Handles QR detection, document configuration lookup, and URL processing
 */
@Injectable()
export class QRProcessingService {
  private readonly logger = new Logger(QRProcessingService.name);

  constructor(
    private readonly qrScanningService: QRScanningService,
    @Inject('QR_CODE_DETECTOR') private readonly qrCodeDetector: IQRCodeDetector,
    private readonly adminService: AdminService,
    private readonly qrContentProcessor: QRContentProcessorService,
  ) {}

  /**
   * Process QR code if the document type is configured for QR processing
   * @param fileBuffer - File buffer to check for QR codes
   * @param mimeType - MIME type of the file
   * @param documentSubType - Document subtype to check configuration
   * @returns QR processing result or null if no QR processing needed
   */
  async processQRCodeIfRequired(
    fileBuffer: Buffer,
    mimeType: string,
    documentSubType?: string,
  ): Promise<QRProcessingResult | null> {
    try {
      // Skip QR processing if no document subtype provided
      if (!documentSubType) {
        this.logger.debug('No document subtype provided - skipping QR processing');
        return null;
      }

      // Get document configuration to check if QR processing is needed
      const documentConfig = await this.getDocumentConfig(documentSubType);
      
      if (!documentConfig) {
        this.logger.debug(`No configuration found for document subtype: ${documentSubType}`);
        return null;
      }

      // Check if this document type has QR processing configured
      if (!documentConfig.docQRContains) {
        this.logger.debug(`Document subtype ${documentSubType} does not have QR processing configured`);
        return null;
      }

      this.logger.log(`Document subtype ${documentSubType} requires QR processing for: ${documentConfig.docQRContains}`);

      // Check if QR detector supports this file type
      if (!this.qrCodeDetector.supportsFileType(mimeType)) {
        this.logger.warn(`QR detection not supported for file type: ${mimeType}`);
        return null; // Return null for unsupported types
      }

      // Detect QR code using the new QRScanningService
      const qrContent = await this.qrScanningService.detectQRCode(fileBuffer, mimeType);

      if (!qrContent) {
        this.logger.error('QR processing failed: No QR code detected');
        return {
          qrCodeDetected: false,
          qrCodeContent: null,
          contentType: documentConfig.docQRContains as any,
          error: 'QR code not found in the uploaded document',
          errorType: 'QR_NOT_FOUND',
          isRequired: true, // Mark as required so OCR service knows this is a failure
        };
      }

      this.logger.log(`QR code detected with content: ${qrContent.substring(0, 100)}...`);

      // Process QR content using the content processor
      return await this.qrContentProcessor.processQRContent(qrContent, documentConfig.docQRContains);
    } catch (error) {
      this.logger.error(`QR processing failed: ${error.message}`, error.stack);
      
      // Return error result for processing failures when QR is required
      return {
        qrCodeDetected: false,
        qrCodeContent: null,
        contentType: documentSubType as any,
        error: 'Unable to process QR code from the document',
        errorType: 'PROCESSING_ERROR',
        isRequired: true,
        technicalError: error.message,
      };
    }
  }

  /**
   * Get document configuration from settings table
   * @param documentSubType - Document subtype to look up
   * @returns Document configuration or null if not found
   */
  private async getDocumentConfig(documentSubType: string): Promise<DocumentConfig | null> {
    try {
      const vcConfig = await this.adminService.getConfigByKey('vcConfiguration');
      
      if (!vcConfig?.value || !Array.isArray(vcConfig.value)) {
        this.logger.warn('vcConfiguration not found or invalid in settings');
        return null;
      }

      const config = vcConfig.value.find(
        (doc: DocumentConfig) => doc.documentSubType === documentSubType
      );

      return config || null;
    } catch (error) {
      this.logger.error(`Failed to get document configuration: ${error.message}`, error.stack);
      
      // Return null but log the specific error for debugging
      if (error.code === 'ECONNREFUSED') {
        this.logger.error('Database connection failed while fetching document configuration');
      } else if (error.name === 'QueryFailedError') {
        this.logger.error('Database query failed while fetching document configuration');
      }
      
      return null;
    }
  }
}