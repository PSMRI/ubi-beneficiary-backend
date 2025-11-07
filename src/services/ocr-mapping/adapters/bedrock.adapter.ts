import { Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { IAiMappingAdapter } from '../interfaces/ocr-mapping.interface';

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
  async mapTextToSchema(extractedText: string, schema: Record<string, any>): Promise<Record<string, any> | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Bedrock adapter not properly configured');
      this.logger.debug(`Configuration check - AccessKey: ${!!process.env.OCR_MAPPING_BEDROCK_ACCESS_KEY_ID}, SecretKey: ${!!process.env.OCR_MAPPING_BEDROCK_SECRET_ACCESS_KEY}, Region: ${!!process.env.OCR_MAPPING_BEDROCK_REGION}`);
      return null;
    }

    try {
      this.logger.debug(`Building prompt for model: ${this.modelId}`);
      const prompt = this.buildPrompt(extractedText, schema);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);
      
      this.logger.debug('Invoking Bedrock model...');
      const response = await this.invokeModel(prompt);
      this.logger.debug(`Bedrock response received, length: ${response.length} characters`);
      
      const parsedResult = this.parseResponse(response);
      this.logger.debug(`Parsed result: ${JSON.stringify(parsedResult)}`);
      
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Bedrock mapping failed: ${error?.message || error}`, error?.stack);
      return null;
    }
  }

  /**
   * Build the prompt for Bedrock model
   */
  private buildPrompt(extractedText: string, schema: Record<string, any>): string {
    return [
      'You are a helpful assistant that extracts and maps data from extracted text to a JSON schema.',
      '',
      'Extracted text from document:',
      extractedText,
      '',
      'Target JSON schema:',
      JSON.stringify(schema, null, 2),
      '',
      'Instructions:',
      '1. Analyze the extracted text carefully - this appears to be from an academic marksheet/certificate',
      '2. Map the values from the text to the corresponding fields in the schema',
      '3. For numeric fields (like marks, percentage, cgpa, class numbers), extract numbers and convert to appropriate numeric types',
      '4. For text fields (like names, school names, subjects), extract the corresponding text values exactly as they appear',
      '5. Look for common marksheet patterns like "Student\'s Name:", "Father\'s Name:", "Roll No:", "Registration No:", etc.',
      '6. For marks, look for patterns like "Full Marks: X, Marks Obtained: Y" or tabular data',
      '7. If a field cannot be found in the text, use null for that field',
      '8. Be precise and only extract data that is clearly present in the text',
      '9. For dates, use the format as it appears in the document',
      '10. Pay attention to academic terminology like "Class", "Roll Code", "Registration Number", "Faculty", etc.',
      '',
      'CRITICAL INSTRUCTIONS FOR RESPONSE FORMAT:',
      '- Return ONLY valid JSON - no explanatory text, no markdown, no code blocks',
      '- Do NOT wrap the JSON in ```json``` or ``` code blocks',
      '- Do NOT include phrases like "Here is the JSON object:" or similar',
      '- Start your response directly with { and end with }',
      '- No prefix, no suffix, no explanation - just the raw JSON object',
      '- Example of correct format: {"field1": "value1", "field2": "value2"}',
      '',
      'Return the mapped JSON object:',
    ].join('\n');
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

  /**
   * Parse the response from Bedrock model
   */
  private parseResponse(responseBody: string): Record<string, any> | null {
    try {
      // First try to parse the entire response as JSON
      const parsed = JSON.parse(responseBody);
      
      // Handle different response formats from different models
      if (parsed && typeof parsed === 'object') {
        // Meta Llama format: { generation: "..." }
        if (parsed.generation && typeof parsed.generation === 'string') {
          return this.extractJsonFromText(parsed.generation);
        }
        
        // Claude format: { content: [{ text: "..." }] }
        if (parsed.content && Array.isArray(parsed.content) && parsed.content[0]?.text) {
          return this.extractJsonFromText(parsed.content[0].text);
        }
        
        // Some models return { generated_text: "..." }
        if (parsed.generated_text && typeof parsed.generated_text === 'string') {
          return this.extractJsonFromText(parsed.generated_text);
        }
        
        // Some models return { completion: "..." }
        if (parsed.completion && typeof parsed.completion === 'string') {
          return this.extractJsonFromText(parsed.completion);
        }
        
        // Amazon Titan format: { results: [{ outputText: "..." }] }
        if (parsed.results && Array.isArray(parsed.results) && parsed.results[0]?.outputText) {
          return this.extractJsonFromText(parsed.results[0].outputText);
        }
        
        // Some models return the JSON directly
        if (!parsed.generated_text && !parsed.completion && !parsed.generation && !parsed.content && !parsed.results) {
          return parsed;
        }
      }
    } catch (parseError) {
      this.logger.debug('Failed to parse response as JSON, trying to extract JSON substring');
    }

    // Fallback: try to extract JSON from the response text
    return this.extractJsonFromText(responseBody);
  }

  /**
   * Extract JSON object from text response
   */
  private extractJsonFromText(text: string): Record<string, any> | null {
    try {
      this.logger.debug(`Attempting to extract JSON from text: ${text.substring(0, 200)}...`);
      
      // Try multiple extraction strategies
      
      // Strategy 1: Look for JSON within markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        this.logger.debug('Found JSON in markdown code block');
        const jsonString = codeBlockMatch[1].trim();
        return JSON.parse(jsonString);
      }
      
      // Strategy 2: Look for JSON between "Here is the JSON object:" and next ```
      const jsonObjectMatch = text.match(/here is the json object:\s*```\s*(\{[\s\S]*?\})\s*```/i);
      if (jsonObjectMatch && jsonObjectMatch[1]) {
        this.logger.debug('Found JSON after "Here is the JSON object:"');
        const jsonString = jsonObjectMatch[1].trim();
        return JSON.parse(jsonString);
      }
      
      // Strategy 3: Find the largest valid JSON object in the text
      const jsonMatches = text.match(/\{[\s\S]*?\}/g);
      if (jsonMatches) {
        // Try each JSON-like string, starting with the longest
        const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
        for (const match of sortedMatches) {
          try {
            const cleanedJson = match.trim();
            const parsed = JSON.parse(cleanedJson);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              this.logger.debug(`Successfully parsed JSON object with ${Object.keys(parsed).length} keys`);
              return parsed;
            }
          } catch (parseError) {
            // Continue to next match
            continue;
          }
        }
      }
      
      // Strategy 4: Find the first { and last } to extract JSON (original logic)
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      
      if (startIndex >= 0 && endIndex > startIndex) {
        const jsonString = text.slice(startIndex, endIndex + 1);
        this.logger.debug(`Trying basic extraction: ${jsonString.substring(0, 100)}...`);
        return JSON.parse(jsonString);
      }
      
    } catch (extractError) {
      this.logger.debug(`Failed to extract JSON from text: ${extractError}`);
    }
    
    return null;
  }
}
