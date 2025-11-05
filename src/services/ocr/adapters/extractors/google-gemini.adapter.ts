import { Logger } from '@nestjs/common';
import {
  ITextExtractor,
  ExtractedText,
} from '../../interfaces/text-extractor.interface';
import axios from 'axios';

/**
 * Google Gemini API adapter for text extraction
 * Implements the ITextExtractor interface using Gemini 2.0 Flash Experimental model
 */
export class GoogleGeminiAdapter implements ITextExtractor {
  private readonly logger = new Logger(GoogleGeminiAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly model = 'gemini-2.0-flash-exp';

  constructor(config: { apiKey: string }) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = config.apiKey;
    this.logger.log('Google Gemini adapter initialized');
  }

  /**
   * Validate Gemini API permissions by attempting a minimal API call
   * @returns true if permissions are valid
   * @throws Error if permissions are invalid
   */
  async validatePermissions(): Promise<boolean> {
    try {
      // Test with a simple text-only request to validate API key
      const response = await axios.post(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: 'Test'
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (response.data?.candidates) {
        this.logger.log('Gemini API permissions validated successfully');
        return true;
      }

      throw new Error('Invalid response from Gemini API');
    } catch (error) {
      this.logger.error(`Gemini API validation error: ${error.message}`);

      if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('API key not valid')) {
        throw new Error('Gemini API key is invalid. Please check your GEMINI_API_KEY configuration.');
      }

      if (error.response?.status === 403) {
        throw new Error('Gemini API access denied. Please check your API key permissions.');
      }

      if (error.response?.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please try again later.');
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Gemini API connection timeout. Please check your internet connection.');
      }

      // For any other errors
      throw new Error(`Gemini API configuration error: ${error.message}`);
    }
  }

  /**
   * Extract text from document using Gemini API
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
      this.logger.log(`Starting text extraction for file type: ${mimeType}`);

      // Convert buffer to base64
      const base64Data = fileBuffer.toString('base64');

      // Map MIME type to Gemini format
      const geminiMimeType = this.mapMimeType(mimeType);

      // Create prompt for text extraction only
      const prompt = `Extract all text from this document. Return only the extracted text, preserving the original layout and formatting as much as possible. Do not add any explanations, comments, or additional formatting.`;

      // Call Gemini API
      const response = await axios.post(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: geminiMimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 8192, // Increased for longer documents
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout for large documents
        }
      );

      // Validate response structure
      const candidate = response.data.candidates?.[0];
      const textPart = candidate?.content?.parts?.[0];
      
      if (!candidate || !textPart) {
        this.logger.error('Invalid Gemini response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response structure from Gemini API');
      }

      const fullText = textPart.text;

      if (!fullText) {
        const finishReason = candidate.finishReason;
        this.logger.error(`No text content in Gemini response. Finish reason: ${finishReason}`);
        throw new Error(`No text content received from Gemini. Reason: ${finishReason}`);
      }

      this.logger.log('Raw Gemini response text extracted successfully');

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Text extraction completed in ${processingTime}ms with ${fullText.length} characters extracted`,
      );

      return {
        fullText: fullText.trim(),
        confidence: 90, // Gemini typically has high confidence
        metadata: {
          pageCount: 1,
          processingTime,
          provider: 'google-gemini',
          model: this.model,
          finishReason: candidate.finishReason,
        },
      };
    } catch (error) {
      this.logger.error(
        `Google Gemini extraction failed: ${error.message}`,
        error.stack,
      );

      // Handle specific error cases
      if (error.response?.status === 400) {
        if (error.response.data?.error?.message?.includes('API key not valid')) {
          throw new Error('Gemini API key is invalid. Please check configuration.');
        }
        if (error.response.data?.error?.message?.includes('unsupported MIME type')) {
          throw new Error('Document format not supported by Gemini API.');
        }
        throw new Error(`Invalid request to Gemini API: ${error.response.data?.error?.message || 'Unknown error'}`);
      }

      if (error.response?.status === 403) {
        throw new Error('Gemini API access denied. Please check your API key permissions.');
      }

      if (error.response?.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please try again in a few minutes.');
      }

      if (error.response?.status === 500 || error.response?.status === 503) {
        throw new Error('Gemini API service is temporarily unavailable. Please try again later.');
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Request timeout while processing document. Please try with a smaller file.');
      }

      // For any other errors, provide a generic message
      throw new Error('Unable to process document text extraction with Gemini. Please try again.');
    }
  }

  /**
   * Check if Google Gemini API supports this file type
   * @param mimeType - MIME type to check
   * @returns true if supported
   */
  supportsFileType(mimeType: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
    ];
    return supportedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Get provider name
   * @returns Provider name
   */
  getProviderName(): string {
    return 'google-gemini';
  }

  /**
   * Map common MIME types to Gemini-compatible format
   * @param mimeType - Input MIME type
   * @returns Gemini-compatible MIME type
   */
  private mapMimeType(mimeType: string): string {
    const mimeTypeMap: Record<string, string> = {
      'image/jpg': 'image/jpeg',
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
      'image/webp': 'image/webp',
      'image/heic': 'image/heic',
      'image/heif': 'image/heif',
      'application/pdf': 'application/pdf',
    };

    const normalized = mimeType.toLowerCase();
    const mapped = mimeTypeMap[normalized];

    if (!mapped) {
      this.logger.warn(`Unsupported MIME type: ${mimeType}, defaulting to image/jpeg`);
      return 'image/jpeg';
    }

    return mapped;
  }
}
