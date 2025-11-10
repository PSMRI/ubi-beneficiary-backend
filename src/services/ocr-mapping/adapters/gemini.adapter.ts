import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAiMappingAdapter } from '../interfaces/ocr-mapping.interface';
import { PromptBuilderUtil, JsonParserUtil } from '../utils';

/**
 * Google Gemini adapter for AI-based OCR text mapping
 */
export class GeminiAdapter implements IAiMappingAdapter {
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor() {
    const apiKey = process.env.OCR_MAPPING_GEMINI_API_KEY || '';
    this.modelName = process.env.OCR_MAPPING_GEMINI_MODEL_NAME || 'gemini-1.5-flash';
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
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
      this.logger.debug(`Building prompt for model: ${this.modelName}`);
      const prompt = PromptBuilderUtil.buildMappingPrompt(extractedText, schema, docType);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);
      
      this.logger.debug('Invoking Gemini model...');
      const response = await this.invokeModel(prompt);
      this.logger.debug(`Gemini response received, length: ${response.length} characters`);
      
      const parsedResult = JsonParserUtil.parseAiResponse(response, 'gemini');
      this.logger.debug(`Parsed result: ${JSON.stringify(parsedResult)}`);
      
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Gemini mapping failed: ${error?.message || error}`, error?.stack);
      return null;
    }
  }


  /**
   * Invoke the Gemini model
   */
  private async invokeModel(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 2000,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    this.logger.debug(`Gemini response: ${text.substring(0, 500)}...`);
    return text;
  }

}
