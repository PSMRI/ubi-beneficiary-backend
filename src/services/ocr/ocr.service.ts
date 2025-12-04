import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITextExtractor, ExtractedText } from './interfaces/text-extractor.interface';
import { IFileStorageService } from '@services/storage-providers/file-storage.service.interface';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { QRProcessingService } from './services/qr-processing.service';
import { SUPPORTED_OCR_TYPES } from './constants/mime-types.constants';

/**
 * OCR Service for document text extraction
 * Supports multiple file sources: Buffer, S3 URL, or file path
 * Uses adapter pattern for provider independence
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @Inject('TEXT_EXTRACTOR') private readonly textExtractor: ITextExtractor,
    @Inject('FileStorageService')
    private readonly fileStorageService: IFileStorageService,
    private readonly configService: ConfigService,
    private readonly qrProcessingService: QRProcessingService,
  ) {
    this.logger.log(
      `OCR Service initialized with provider: ${this.textExtractor.getProviderName()}`,
    );
  }

  /**
   * Extract text from a file buffer with QR code processing support
   * This method checks if the document type supports QR processing and handles it accordingly
   * @param fileBuffer - File buffer to extract text from
   * @param mimeType - MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
   * @param documentSubType - Document subtype to check for QR processing configuration
   * @returns Extracted text with metadata and QR processing results
   */
  async extractTextFromBufferWithQR(
    fileBuffer: Buffer,
    mimeType: string,
    documentSubType?: string,
  ): Promise<ExtractedText & { qrProcessing?: any }> {
    try {
      // Validate file buffer
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new BadRequestException('OCR_FILE_BUFFER_EMPTY');
      }

      // Check if file type is supported
      if (!this.textExtractor.supportsFileType(mimeType)) {
        throw new BadRequestException(
          `File type '${mimeType}' is not supported by ${this.textExtractor.getProviderName()}`,
        );
      }

      this.logger.log(
        `Extracting text from buffer (${fileBuffer.length} bytes, type: ${mimeType}, subtype: ${documentSubType})`,
      );

      // Check if this document type requires QR processing
      const qrProcessingResult = await this.qrProcessingService.processQRCodeIfRequired(
        fileBuffer,
        mimeType,
        documentSubType,
      );

      // If QR processing found a document, extract text from the downloaded document
      if (qrProcessingResult?.downloadedDocument) {
        this.logger.log('QR code found with document URL - processing downloaded document');

        const qrResult = await this.textExtractor.extractText(
          qrProcessingResult.downloadedDocument.buffer,
          qrProcessingResult.downloadedDocument.mimeType,
        );

        return {
          ...qrResult,
          qrProcessing: qrProcessingResult,
        };
      }

      // If QR code was detected successfully but contains data (not a document URL)
      // Return the QR content as text without trying to OCR the image
      if (qrProcessingResult?.qrCodeDetected && qrProcessingResult?.qrCodeContent) {
        this.logger.log('QR code detected with data content (no document URL) - returning QR content');

        return {
          fullText: qrProcessingResult.qrCodeContent,
          confidence: 100, // QR detection is certain
          metadata: {
            provider: 'qr-code-detection',
            processingTime: 0,
            qrContentType: qrProcessingResult.contentType,
          },
          qrProcessing: qrProcessingResult,
        };
      }

      // Check if QR processing was required but failed
      if (qrProcessingResult?.error && qrProcessingResult?.isRequired) {
        this.logger.error(`QR processing failed for required document: ${qrProcessingResult.error}`);

        // Provide user-friendly error messages based on error type
        let userMessage = '';
        if (qrProcessingResult.errorType === 'QR_NOT_FOUND') {
          userMessage = 'Please upload a document that contains a valid QR code';
        } else if (qrProcessingResult.errorType === 'PROCESSING_ERROR') {
          userMessage = 'QR code could not be read from this document. Please ensure the QR code is clear and try again';
        } else {
          userMessage = 'This document requires a valid QR code for processing';
        }

        throw new BadRequestException('OCR_TEXT_EXTRACTION_FAILED');
      }

      // Log QR processing issues but don't fail - allow fallback to original document
      if (qrProcessingResult?.error) {
        this.logger.warn(`QR processing had issues: ${qrProcessingResult.error} - Processing original document instead`);
      }

      // No QR processing needed or no QR found - process original document
      const result = await this.textExtractor.extractText(fileBuffer, mimeType);

      this.logger.log(
        `Text extraction successful. Extracted ${result.fullText.length} characters with ${result.confidence}% confidence`,
      );

      return {
        ...result,
        qrProcessing: qrProcessingResult,
      };
    } catch (error) {
      this.logger.error(
        `Text extraction failed: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `OCR processing failed: ${error.message}`,
      );
    }
  }
  async extractTextFromBuffer(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedText> {
    try {
      // Validate file buffer
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new BadRequestException('OCR_FILE_BUFFER_EMPTY');
      }

      // Check if file type is supported
      if (!this.textExtractor.supportsFileType(mimeType)) {
        throw new BadRequestException(
          `File type '${mimeType}' is not supported by ${this.textExtractor.getProviderName()}`,
        );
      }

      this.logger.log(
        `Extracting text from buffer (${fileBuffer.length} bytes, type: ${mimeType})`,
      );

      // Perform OCR extraction
      const result = await this.textExtractor.extractText(fileBuffer, mimeType);

      this.logger.log(
        `Text extraction successful. Extracted ${result.fullText.length} characters with ${result.confidence}% confidence`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Text extraction failed: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `OCR processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from an S3 file path
   * Downloads file from S3 and then performs OCR
   * @param s3FilePath - S3 file path (e.g., 'dev/user-id/file.pdf')
   * @param mimeType - MIME type of the file
   * @returns Extracted text with metadata
   */
  async extractTextFromS3(
    s3FilePath: string,
    mimeType: string,
  ): Promise<ExtractedText> {
    try {
      this.logger.log(`Fetching file from S3: ${s3FilePath}`);

      // Download file from S3
      const fileBuffer = await this.downloadFromS3(s3FilePath);

      // Extract text from the buffer
      return await this.extractTextFromBuffer(fileBuffer, mimeType);
    } catch (error) {
      this.logger.error(
        `Failed to extract text from S3 file: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to process S3 file: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from a file (works with both S3 and local storage)
   * Automatically detects storage type based on configuration
   * @param filePath - File path (S3 key or local path)
   * @param mimeType - MIME type of the file
   * @returns Extracted text with metadata
   */
  async extractTextFromFile(
    filePath: string,
    mimeType: string,
  ): Promise<ExtractedText> {
    const storageProvider = this.configService.get<string>(
      'FILE_STORAGE_PROVIDER',
      'local',
    );

    if (storageProvider === 's3') {
      return await this.extractTextFromS3(filePath, mimeType);
    } else {
      // For local storage, you would read the file from disk
      throw new BadRequestException(
        'Local file extraction not implemented yet. Use extractTextFromBuffer instead.',
      );
    }
  }

  /**
   * Check if a file type is supported by the current OCR provider
   * @param mimeType - MIME type to check
   * @returns true if supported, false otherwise
   */
  isFileTypeSupported(mimeType: string): boolean {
    return this.textExtractor.supportsFileType(mimeType);
  }

  /**
   * Get the name of the current OCR provider
   * @returns Provider name (e.g., 'aws-textract')
   */
  getProviderName(): string {
    return this.textExtractor.getProviderName();
  }

  /**
   * Get list of supported file types
   * @returns Array of supported MIME types
   */
  getSupportedFileTypes(): string[] {
    return [...SUPPORTED_OCR_TYPES];
  }

  /**
   * Private method to download file from S3
   * @param s3Key - S3 object key
   * @returns File buffer
   */
  private async downloadFromS3(s3Key: string): Promise<Buffer> {
    try {
      const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
      const region = this.configService.get<string>('AWS_S3_AWS_REGION');

      if (!bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME not configured');
      }

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_S3_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get<string>(
            'AWS_S3_SECRET_ACCESS_KEY',
          ),
        },
      });

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      const stream = response.Body;

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream as any) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download from S3: ${error.message}`);
      throw new Error(`S3 download failed: ${error.message}`);
    }
  }
}
