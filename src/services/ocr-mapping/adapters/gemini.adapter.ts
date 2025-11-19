import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAiMappingAdapter } from '../interfaces/ocr-mapping.interface';
import { JsonParserUtil } from '../utils';
import { getGeminiMappingConfig } from '../../../config/ai-models.config';
import { buildOcrMappingPrompt } from '../../../config/prompts.config';
import { handleMappingError } from '../../ocr/utils/error-handler.util';

/**
 * Google Gemini adapter for AI-based OCR text mapping
 */
export class GeminiAdapter implements IAiMappingAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly config = getGeminiMappingConfig();

  constructor() {
    const apiKey = process.env.OCR_MAPPING_GEMINI_API_KEY || '';
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    
    this.logger.log(`Gemini mapping adapter initialized - model: ${this.config.model}`);
  }

  /**
   * Check if Gemini adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.OCR_MAPPING_GEMINI_API_KEY);
  }

  /**
   * Map extracted text to structured data using Gemini AI
   */
  async mapTextToSchema(extractedText: string, schema: Record<string, any>, docType?: string): Promise<Record<string, any> | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Gemini adapter not configured - missing API key');
      return null;
    }

    try {
      const prompt = buildOcrMappingPrompt(extractedText, schema);
      this.logger.debug(`Sending request to Gemini (${Object.keys(schema.properties || {}).length} fields)`);
      
      const response = await this.invokeModel(prompt);
      const parsedResult = JsonParserUtil.parseAiResponse(response, 'gemini');
      
      if (!parsedResult || Object.keys(parsedResult).length === 0) {
        this.logger.warn('Gemini returned empty result');
        return null;
      }
      
      this.logger.debug(`Gemini extracted ${Object.keys(parsedResult).length} fields`);
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Gemini mapping failed: ${error?.message || error}`);
      handleMappingError(error, 'gemini');
    }
  }


  /**
   * Invoke the Gemini model
   */
  private async invokeModel(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        topP: this.config.topP,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

}
