import { Logger } from '@nestjs/common';
import {
  ITextExtractor,
  ExtractedText,
} from '../../interfaces/text-extractor.interface';
import {
  TextractClient,
  DetectDocumentTextCommand,
  Block,
} from '@aws-sdk/client-textract';
import { SUPPORTED_OCR_TYPES } from '../../constants/mime-types.constants';
import { handleOcrError, handleValidationError } from '../../utils/error-handler.util';

/**
 * AWS Textract adapter for text extraction
 * Implements the ITextExtractor interface
 */
export class AWSTextractAdapter implements ITextExtractor {
  private readonly logger = new Logger(AWSTextractAdapter.name);
  private readonly client: TextractClient;

  constructor(config: { region: string; credentials?: any }) {
    this.client = new TextractClient({
      region: config.region,
      credentials: config.credentials,
    });
    
    this.logger.log(`AWS Textract adapter initialized - region: ${config.region}`);
  }

  /**
   * Validate AWS Textract permissions by attempting a minimal API call
   * @returns true if permissions are valid
   * @throws Error if permissions are invalid
   */
  async validatePermissions(): Promise<boolean> {
    try {
      const singlePixelBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const command = new DetectDocumentTextCommand({
        Document: { Bytes: singlePixelBuffer },
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      this.logger.error(`AWS Textract validation failed: ${error.message}`);
      handleValidationError(error, 'aws-textract');
    }
  }

  /**
   * Extract text from document using AWS Textract
   * @param fileBuffer - Document buffer (image or PDF)
   * @param mimeType - MIME type of the document
   * @returns Extracted text with metadata
   */
  async extractText(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ExtractedText> {
    const startTime = Date.now();

    try {
      const command = new DetectDocumentTextCommand({
        Document: { Bytes: fileBuffer },
      });

      const response = await this.client.send(command);

      const fullText =
        response.Blocks?.filter((block) => block.BlockType === 'LINE')
          .map((block) => block.Text)
          .join('\n') || '';

      const confidence = this.calculateAverageConfidence(response.Blocks || []);
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`AWS Textract extracted ${fullText.length} characters in ${processingTime}ms`);

      return {
        fullText,
        confidence,
        metadata: {
          pageCount: 1,
          processingTime,
          provider: 'aws-textract',
          blockCount: response.Blocks?.length || 0,
        },
      };
    } catch (error) {
      this.logger.error(`AWS Textract extraction failed: ${error.message}`, error.stack);
      handleOcrError(error, 'aws-textract');
    }
  }

  /**
   * Check if AWS Textract supports this file type
   * @param mimeType - MIME type to check
   * @returns true if supported
   */
  supportsFileType(mimeType: string): boolean {
    return SUPPORTED_OCR_TYPES.includes(mimeType.toLowerCase());
  }

  /**
   * Get provider name
   * @returns Provider name
   */
  getProviderName(): string {
    return 'aws-textract';
  }

  /**
   * Calculate average confidence from Textract blocks
   * @param blocks - Array of Textract blocks
   * @returns Average confidence score (0-100)
   */
  private calculateAverageConfidence(blocks: Block[]): number {
    if (!blocks || blocks.length === 0) return 0;

    const confidences = blocks
      .filter((b) => b.Confidence !== undefined && b.Confidence !== null)
      .map((b) => b.Confidence);

    if (confidences.length === 0) return 0;

    const sum = confidences.reduce((a, b) => a + b, 0);
    const average = sum / confidences.length;

    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }
}
