/**
 * Interface for QR Code detection and processing
 */
export interface IQRCodeDetector {
  /**
   * Detect and decode QR code from a file buffer
   * @param fileBuffer - File buffer (image or PDF)
   * @param mimeType - MIME type of the file
   * @returns Decoded QR code content or null if no QR code found
   */
  detectQRCode(fileBuffer: Buffer, mimeType: string): Promise<string | null>;

  /**
   * Download file from a URL
   * @param url - URL to download from
   * @returns File buffer and detected MIME type
   */
  downloadFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string }>;

  /**
   * Check if QR code processing is supported for this file type
   * @param mimeType - MIME type to check
   * @returns true if supported
   */
  supportsFileType(mimeType: string): boolean;
}

/**
 * Result interface for QR code processing
 */
export interface QRCodeProcessingResult {
  qrCodeDetected: boolean;
  qrCodeContent?: string;
  downloadedDocument?: {
    buffer: Buffer;
    mimeType: string;
    url: string;
  };
  error?: string;
}

/**
 * Document configuration interface from settings table
 */
export interface DocumentConfig {
  name: string;
  label: string;
  docType: string;
  issueVC: string;
  vcFields?: Record<string, any>;
  documentSubType: string;
  docQRContains?: string;
}