import { Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { IAiMappingAdapter } from '../interfaces/ocr-mapping.interface';
import { PromptBuilderUtil, JsonParserUtil } from '../utils';

/**
 * Amazon Bedrock adapter for AI-based OCR text mapping
 */
export class BedrockAdapter implements IAiMappingAdapter {
  private readonly logger = new Logger(BedrockAdapter.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor() {
    const region = process.env.OCR_MAPPING_BEDROCK_REGION || 'ap-south-1';
    this.modelId = process.env.OCR_MAPPING_BEDROCK_MODEL_ID || 'meta.llama3-8b-instruct-v1:0';
    
    this.client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: process.env.OCR_MAPPING_BEDROCK_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.OCR_MAPPING_BEDROCK_SECRET_ACCESS_KEY || '',
      },
    });
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
      this.logger.debug(`Building prompt for model: ${this.modelId}`);
      const prompt = PromptBuilderUtil.buildMappingPrompt(extractedText, schema, docType);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);
      
      this.logger.debug('Invoking Bedrock model...');
      const response = await this.invokeModel(prompt);
      this.logger.debug(`Bedrock response received, length: ${response.length} characters`);
      
      const parsedResult = JsonParserUtil.parseAiResponse(response, 'bedrock');
      this.logger.debug(`Parsed result: ${JSON.stringify(parsedResult)}`);
      
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Bedrock mapping failed: ${error?.message || error}`, error?.stack);
      return null;
    }
  }


  /**
   * Invoke the Bedrock model
   */
  private async invokeModel(prompt: string): Promise<string> {
    // Different models have different input formats
    let input: any;
    
    if (this.modelId.includes('meta.llama')) {
      // Meta Llama format
      input = {
        prompt,
        max_gen_len: 2000,
        temperature: 0.1,
        top_p: 0.9,
      };
    } else if (this.modelId.includes('anthropic.claude')) {
      // Claude format
      input = {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.1,
      };
    } else {
      // Default/Amazon Titan format
      input = {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 2000,
          temperature: 0.1,
          topP: 0.9,
        },
      };
    }

    const command = new InvokeModelCommand({
      modelId: this.modelId,
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
