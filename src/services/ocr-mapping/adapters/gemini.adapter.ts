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
    
    this.logger.log(`Gemini mapping adapter initialized with model: ${this.config.model}`);
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
      this.logger.warn('Gemini adapter not properly configured');
      this.logger.debug(`Configuration check - API Key: ${!!process.env.OCR_MAPPING_GEMINI_API_KEY}`);
      return null;
    }

    try {
      this.logger.debug(`Building prompt for model: ${this.config.model}`);
      const prompt = buildOcrMappingPrompt(extractedText, schema);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);
      this.logger.debug(`Prompt preview: ${prompt.substring(0, 300)}...`);
      
      this.logger.debug('Invoking Gemini model...');
      const response = await this.invokeModel(prompt);
      this.logger.debug(`Gemini response received, length: ${response.length} characters`);
      this.logger.debug(`Raw Gemini response: ${response.substring(0, 500)}...`);
      
      const parsedResult = JsonParserUtil.parseAiResponse(response, 'gemini');
      this.logger.debug(`Parsed result: ${JSON.stringify(parsedResult)}`);
      
      if (!parsedResult || Object.keys(parsedResult).length === 0) {
        this.logger.warn('Gemini returned empty or null result');
        this.logger.debug(`Full response for debugging: ${response}`);
        return null;
      }
      
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Gemini mapping failed: ${error?.message || error}`, error?.stack);
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
    const response = result.response;
    const text = response.text();
    
    this.logger.debug(`Gemini response: ${text.substring(0, 500)}...`);
    return text;
  }

}
