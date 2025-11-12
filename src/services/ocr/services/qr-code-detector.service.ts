import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import axios from 'axios';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { 
  BarcodeFormat, 
  DecodeHintType, 
  BinaryBitmap, 
  HybridBinarizer, 
  MultiFormatReader,
  RGBLuminanceSource,
  NotFoundException 
} from '@zxing/library';
import jsQR from 'jsqr';
import { IQRCodeDetector } from '../interfaces/qr-code-detector.interface';
import { QR_SUPPORTED_TYPES } from '../constants/mime-types.constants';
import { detectMimeTypeFromUrl, isImageType } from '../utils/mime-type.utils';

/**
 * Service for detecting and processing QR codes from image documents
 * Supports images (JPEG, PNG) and PDF files
 * 
 * Note: This is a simplified implementation. For production use,
 * you would integrate with a proper QR detection library like:
 * - qrcode-reader
 * - jsqr
 * - node-qrcode-reader
 */
@Injectable()
export class QRCodeDetectorService implements IQRCodeDetector {
  private readonly logger = new Logger(QRCodeDetectorService.name);
  private readonly downloadTimeout = 30000; // 30 seconds
  private readonly maxDownloadSize = 10485760; // 10MB

  /**
   * Detect QR code from image buffer
   * @param fileBuffer - File buffer
   * @param mimeType - MIME type of the file
   * @returns Decoded QR code content or null if no QR code found
   */
  async detectQRCode(fileBuffer: Buffer, mimeType: string): Promise<string | null> {
    try {
      this.logger.log(`Starting QR code detection for file type: ${mimeType}`);

      // Only support image types for QR code detection
      if (mimeType === 'application/pdf') {
        throw new Error('PDF QR code detection is not supported. Please convert your PDF to an image (PNG, JPEG) and try again.');
      }
      
      if (!isImageType(mimeType)) {
        throw new Error(`Unsupported file type for QR code detection: ${mimeType}. Only image formats (PNG, JPEG) are supported.`);
      }

      const imageBuffer = fileBuffer;

      // Log image metadata for debugging
      const metadata = await sharp(imageBuffer).metadata();
      this.logger.log(`Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}, channels: ${metadata.channels}`);

      // Try multiple detection strategies
      const strategies = [
        () => this.detectQRWithOriginalSize(imageBuffer),
        () => this.detectQRWithJsQR(imageBuffer), // Alternative library
        () => this.detectQRWithScaling(imageBuffer, 2), // Scale up 2x
        () => this.detectQRWithScaling(imageBuffer, 0.5), // Scale down 0.5x
        () => this.detectQRWithGrayscale(imageBuffer),
        () => this.detectQRWithContrast(imageBuffer),
      ];

      for (const [index, strategy] of strategies.entries()) {
        try {
          this.logger.log(`Trying QR detection strategy ${index + 1}/${strategies.length}`);
          const result = await strategy();
          if (result) {
            this.logger.log(`🎉 QR code detected successfully with strategy ${index + 1}: ${result.substring(0, 100)}...`);
            return result;
          }
          this.logger.debug(`Strategy ${index + 1} completed but found no QR code`);
        } catch (error) {
          this.logger.warn(`Strategy ${index + 1} failed: ${error.message}`);
        }
      }

      this.logger.log('No QR code found in the image after trying all strategies');
      return null;
    } catch (error) {
      this.logger.error(`QR code detection failed: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Detect QR code using jsQR library as alternative
   */
  private async detectQRWithJsQR(imageBuffer: Buffer): Promise<string | null> {
    const processedImage = await sharp(imageBuffer)
      .png()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imageData = {
      data: new Uint8ClampedArray(processedImage.data),
      width: processedImage.info.width,
      height: processedImage.info.height,
    };

    const result = jsQR(imageData.data, imageData.width, imageData.height);
    return result ? result.data : null;
  }

  /**
   * Detect QR code with original image size
   */
  private async detectQRWithOriginalSize(imageBuffer: Buffer): Promise<string | null> {
    const processedImage = await sharp(imageBuffer)
      .grayscale()
      .png()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return this.decodeQRFromImageData(processedImage.data, processedImage.info.width, processedImage.info.height);
  }

  /**
   * Detect QR code with image scaling
   */
  private async detectQRWithScaling(imageBuffer: Buffer, scale: number): Promise<string | null> {
    const processedImage = await sharp(imageBuffer)
      .resize({ 
        width: Math.round(await this.getImageWidth(imageBuffer) * scale),
        height: Math.round(await this.getImageHeight(imageBuffer) * scale),
        fit: 'fill'
      })
      .grayscale()
      .png()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return this.decodeQRFromImageData(processedImage.data, processedImage.info.width, processedImage.info.height);
  }

  /**
   * Detect QR code with grayscale conversion
   */
  private async detectQRWithGrayscale(imageBuffer: Buffer): Promise<string | null> {
    // Convert to grayscale and apply a threshold to binarize the image,
    // which can improve QR detection on low-contrast or noisy images.
    const processedImage = await sharp(imageBuffer)
      .grayscale()
      .threshold(150) // binarize; adjust threshold level if needed
      .png()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return this.decodeQRFromImageData(processedImage.data, processedImage.info.width, processedImage.info.height);
  }

  /**
   * Detect QR code with enhanced contrast
   */
  private async detectQRWithContrast(imageBuffer: Buffer): Promise<string | null> {
    const processedImage = await sharp(imageBuffer)
      .normalize()
      .sharpen()
      .grayscale()
      .png()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return this.decodeQRFromImageData(processedImage.data, processedImage.info.width, processedImage.info.height);
  }

  /**
   * Decode QR code from image data using ZXing
   */
  private decodeQRFromImageData(data: Buffer, width: number, height: number): string | null {
    try {
      // Create luminance source from image data
      const luminanceSource = new RGBLuminanceSource(
        new Uint8ClampedArray(data),
        width,
        height
      );

      // Create binary bitmap
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

      // Create reader with QR code format hint
      const reader = new MultiFormatReader();
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      reader.setHints(hints);

      // Attempt to decode QR code
      const result = reader.decode(binaryBitmap);
      return result.getText();
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get image width
   */
  private async getImageWidth(imageBuffer: Buffer): Promise<number> {
    const metadata = await sharp(imageBuffer).metadata();
    return metadata.width || 0;
  }

  /**
   * Get image height
   */
  private async getImageHeight(imageBuffer: Buffer): Promise<number> {
    const metadata = await sharp(imageBuffer).metadata();
    return metadata.height || 0;
  }

  /**
   * Download file from a URL
   * @param url - URL to download from
   * @returns File buffer and detected MIME type
   */
  async downloadFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      this.logger.log(`Downloading document from URL: ${url}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.downloadTimeout,
        maxContentLength: this.maxDownloadSize,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const buffer = Buffer.from(response.data);
      
      // Validate downloaded size
      if (buffer.length > this.maxDownloadSize) {
        throw new Error(`Downloaded file exceeds maximum size of ${this.maxDownloadSize} bytes`);
      }
      
      const mimeType = response.headers['content-type'] || detectMimeTypeFromUrl(url);

      this.logger.log(`Downloaded ${buffer.length} bytes, detected type: ${mimeType}`);

      return { buffer, mimeType };
    } catch (error) {
      this.logger.error(`Failed to download from URL ${url}: ${error.message}`);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Check if QR code processing is supported for this file type
   * @param mimeType - MIME type to check
   * @returns true if supported
   */
  supportsFileType(mimeType: string): boolean {
    return QR_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
  }

  /**
   * Enhance image for better QR code detection
   */
  private async enhanceImageForQR(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .greyscale()
        .normalise()
        .sharpen()
        .gamma(2.2)
        .png()
        .toBuffer();
    } catch (error) {
      this.logger.debug(`Image enhancement failed: ${error.message}`);
      return imageBuffer;
    }
  }

  /**
   * Clean up temporary files
   */
  private cleanupTempFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
      }
    }
  }
}