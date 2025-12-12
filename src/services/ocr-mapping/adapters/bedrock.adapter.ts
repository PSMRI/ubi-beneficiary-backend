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
    
    this.logger.log(
      `Bedrock initialized: ${this.config.modelId} (${this.config.modelType}) | Region: ${region}`
    );
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
  async mapTextToSchema(extractedText: string, schema: Record<string, any>, expectedDocumentName: string, docType?: string): Promise<Record<string, any> | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Bedrock adapter not configured - missing credentials');
      return null;
    }

    try {
      const prompt = buildOcrMappingPrompt(extractedText, schema, expectedDocumentName);
      this.logger.debug(`Sending request to Bedrock (${Object.keys(schema.properties || {}).length} fields, expectedDocumentName: ${expectedDocumentName})`);
      const response = await this.invokeModel(prompt);
      const parsedResult = JsonParserUtil.parseAiResponse(response, 'bedrock');
      
      if (!parsedResult || Object.keys(parsedResult).length === 0) {
        this.logger.warn('Bedrock returned empty result');
        return null;
      }
      
      this.logger.debug(`Bedrock extracted ${Object.keys(parsedResult).length} fields, isValidDocument: ${parsedResult.isValidDocument}`);
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Bedrock mapping failed: ${error?.message || error}`);
      handleMappingError(error, 'bedrock');
    }
  }


  /**
   * Build request payload based on detected model type
   * To add new model family: add case here + update detectModelFamily() in config
   */
  private buildRequest(prompt: string): any {
    switch (this.config.modelType) {
      case 'claude':
        return {
          anthropic_version: this.config.anthropicVersion || 'bedrock-2023-05-31',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          top_p: this.config.topP,
        };

      case 'openai':
        return {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          top_p: this.config.topP,
        };

      case 'llama':
      default:
        return {
          prompt,
          max_gen_len: this.config.maxGenLen,
          temperature: this.config.temperature,
          top_p: this.config.topP,
        };
    }
  }

  /**
   * Invoke the Bedrock model
   */
  private async invokeModel(prompt: string): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.config.modelId,
        body: JSON.stringify(this.buildRequest(prompt)),
      });
      
      const response = await this.client.send(command);
      return new TextDecoder().decode(response.body);
    } catch (error: any) {
      this.logger.error(
        `Bedrock API error: ${error?.message}`,
        {
          model: this.config.modelId,
          type: this.config.modelType,
          status: error?.$metadata?.httpStatusCode,
        }
      );
      throw error;
    }
  }

}
