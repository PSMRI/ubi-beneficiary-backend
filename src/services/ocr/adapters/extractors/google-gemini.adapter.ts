import { Logger } from '@nestjs/common';
import {
  ITextExtractor,
  ExtractedText,
} from '../../interfaces/text-extractor.interface';
import axios from 'axios';
import { getGeminiOcrConfig } from '../../../../config/ai-models.config';
import { getOcrExtractionPrompt, getValidationPrompt } from '../../../../config/prompts.config';
import { GEMINI_SUPPORTED_TYPES } from '../../constants/mime-types.constants';
import { normalizeMimeType } from '../../utils/mime-type.utils';
import { handleOcrError, handleValidationError } from '../../utils/error-handler.util';

/**
 * Google Gemini API adapter for text extraction
 * Implements the ITextExtractor interface using Gemini 2.0 Flash Experimental model
 */
export class GoogleGeminiAdapter implements ITextExtractor {
  private readonly logger = new Logger(GoogleGeminiAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly config = getGeminiOcrConfig();

  constructor(config: { apiKey: string }) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = config.apiKey;
    
    this.logger.log(`Google Gemini OCR adapter initialized - model: ${this.config.model}`);
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
        `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: getValidationPrompt()
                }
              ]
            }
          ],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.validationMaxTokens,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.config.validationTimeout,
        }
      );

      if (response.data?.candidates) {
        return true;
      }

      throw new Error('Invalid response from Gemini API');
    } catch (error) {
      this.logger.error(`Gemini API validation failed: ${error.message}`);
      handleValidationError(error, 'google-gemini');
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

    const base64Data = fileBuffer.toString('base64');
    const geminiMimeType = normalizeMimeType(mimeType);
    const prompt = getOcrExtractionPrompt();
    const payload = this.buildGeneratePayload(base64Data, geminiMimeType, prompt);

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }
      );

      return this.parseGeminiResponse(response, startTime);
    } catch (error) {
      this.logger.error(`Google Gemini extraction failed: ${error.message}`, error.stack);
      handleOcrError(error, 'google-gemini');
    }
  }

  private buildGeneratePayload(base64Data: string, geminiMimeType: string, prompt: string) {
    return {
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
        temperature: this.config.temperature,
        topK: this.config.topK,
        topP: this.config.topP,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    };
  }

  private parseGeminiResponse(response: any, startTime: number): ExtractedText {
    // Validate response structure
    const candidate = response.data?.candidates?.[0];
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

    const processingTime = Date.now() - startTime;
    this.logger.log(`Google Gemini extracted ${fullText.length} characters in ${processingTime}ms`);

    return {
      fullText: fullText.trim(),
      confidence: 90, // Gemini typically has high confidence
      metadata: {
        pageCount: 1,
        processingTime,
        provider: 'google-gemini',
        model: this.config.model,
        finishReason: candidate.finishReason,
      },
    };
  }


  /**
   * Check if Google Gemini API supports this file type
   * @param mimeType - MIME type to check
   * @returns true if supported
   */
  supportsFileType(mimeType: string): boolean {
    return GEMINI_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
  }

  /**
   * Get provider name
   * @returns Provider name
   */
  getProviderName(): string {
    return 'google-gemini';
  }

}
