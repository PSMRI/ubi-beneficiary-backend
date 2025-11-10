import { Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { IAiMappingAdapter } from '../interfaces/ocr-mapping.interface';
import { JsonParserUtil } from '../utils';
import { 
  getBedrockMappingConfig 
} from '../../../config/ai-models.config';
import { buildOcrMappingPrompt } from '../../../config/prompts.config';
import { handleMappingError } from '../../ocr/utils/error-handler.util';

/**
 * Amazon Bedrock adapter for AI-based OCR text mapping
 */
export class BedrockAdapter implements IAiMappingAdapter {
  private readonly logger = new Logger(BedrockAdapter.name);
  private readonly client: BedrockRuntimeClient;
  private readonly config = getBedrockMappingConfig();

  constructor() {
    const region = process.env.OCR_MAPPING_BEDROCK_REGION || 'ap-south-1';
    
    this.client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: process.env.OCR_MAPPING_BEDROCK_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.OCR_MAPPING_BEDROCK_SECRET_ACCESS_KEY || '',
      },
    });
    
    this.logger.log(`Bedrock adapter initialized with model: ${this.config.modelId}`);
  }

  /**
   * Check if Bedrock adapter is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.OCR_MAPPING_BEDROCK_ACCESS_KEY_ID &&
      process.env.OCR_MAPPING_BEDROCK_SECRET_ACCESS_KEY &&
      process.env.OCR_MAPPING_BEDROCK_REGION
    );
  }

  /**
   * Map extracted text to structured data using Bedrock AI
   */
  async mapTextToSchema(extractedText: string, schema: Record<string, any>, docType?: string): Promise<Record<string, any> | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Bedrock adapter not properly configured');
      this.logger.debug(`Configuration check - AccessKey: ${!!process.env.OCR_MAPPING_BEDROCK_ACCESS_KEY_ID}, SecretKey: ${!!process.env.OCR_MAPPING_BEDROCK_SECRET_ACCESS_KEY}, Region: ${!!process.env.OCR_MAPPING_BEDROCK_REGION}`);
      return null;
    }

    try {
      this.logger.debug(`Building prompt for model: ${this.config.modelId}`);
      const prompt = buildOcrMappingPrompt(extractedText, schema);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);
      this.logger.debug(`Prompt preview: ${prompt.substring(0, 300)}...`);
      
      this.logger.debug('Invoking Bedrock model...');
      const response = await this.invokeModel(prompt);
      this.logger.debug(`Bedrock response received, length: ${response.length} characters`);
      this.logger.debug(`Raw Bedrock response: ${response.substring(0, 500)}...`);
      
      const parsedResult = JsonParserUtil.parseAiResponse(response, 'bedrock');
      this.logger.debug(`Parsed result: ${JSON.stringify(parsedResult)}`);
      
      if (!parsedResult || Object.keys(parsedResult).length === 0) {
        this.logger.warn('Bedrock returned empty or null result');
        this.logger.debug(`Full response for debugging: ${response}`);
        return null;
      }
      
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Bedrock mapping failed: ${error?.message || error}`, error?.stack);
      handleMappingError(error, 'bedrock');
    }
  }


  /**
   * Invoke the Bedrock Llama model
   */
  private async invokeModel(prompt: string): Promise<string> {
    // Using Llama model format with mapping config
    const input = {
      prompt,
      max_gen_len: this.config.maxGenLen,
      temperature: this.config.temperature,
      top_p: this.config.topP,
    };

    const command = new InvokeModelCommand({
      modelId: this.config.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(JSON.stringify(input)),
    });

    const response = await this.client.send(command);
    const bodyString = new TextDecoder().decode(response.body);
    
    this.logger.debug(`Bedrock response: ${bodyString.substring(0, 500)}...`);
    return bodyString;
  }

}
