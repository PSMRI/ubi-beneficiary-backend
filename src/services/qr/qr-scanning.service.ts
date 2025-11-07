import { Injectable, Logger, Inject } from '@nestjs/common';
import { IQRCodeDetector } from '../ocr/interfaces/qr-code-detector.interface';

@Injectable()
export class QRScanningService {
  private readonly logger = new Logger(QRScanningService.name);

  constructor(@Inject('QR_CODE_DETECTOR') private readonly qrCodeDetector: IQRCodeDetector) {}

  /**
   * Detect and process QR code from a file buffer
   * @param fileBuffer - File buffer to check for QR codes
   * @param mimeType - MIME type of the file
   * @returns Detected QR code content or null if not found
   */
  async detectQRCode(fileBuffer: Buffer, mimeType: string): Promise<string | null> {
    try {
      // Check if QR detector supports this file type
      if (!this.qrCodeDetector.supportsFileType(mimeType)) {
        this.logger.warn(`QR detection not supported for file type: ${mimeType}`);
        return null;
      }

      // Detect QR code
      const qrContent = await this.qrCodeDetector.detectQRCode(fileBuffer, mimeType);

      if (!qrContent) {
        this.logger.log('No QR code found in document');
        return null;
      }

      this.logger.log(`QR code detected with content: ${qrContent.substring(0, 100)}...`);
      return qrContent;
    } catch (error) {
      this.logger.error(`QR detection failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}