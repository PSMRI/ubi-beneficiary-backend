import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAiMappingAdapter } from '../interfaces/ocr-mapping.interface';

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
  async mapTextToSchema(extractedText: string, schema: Record<string, any>): Promise<Record<string, any> | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Gemini adapter not properly configured');
      this.logger.debug(`Configuration check - API Key: ${!!process.env.OCR_MAPPING_GEMINI_API_KEY}`);
      return null;
    }

    try {
      this.logger.debug(`Building prompt for model: ${this.modelName}`);
      const prompt = this.buildPrompt(extractedText, schema);
      this.logger.debug(`Prompt length: ${prompt.length} characters`);
      
      this.logger.debug('Invoking Gemini model...');
      const response = await this.invokeModel(prompt);
      this.logger.debug(`Gemini response received, length: ${response.length} characters`);
      
      const parsedResult = this.parseResponse(response);
      this.logger.debug(`Parsed result: ${JSON.stringify(parsedResult)}`);
      
      return parsedResult;
    } catch (error: any) {
      this.logger.error(`Gemini mapping failed: ${error?.message || error}`, error?.stack);
      return null;
    }
  }

  /**
   * Build the prompt for Gemini model
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
    const response = await result.response;
    const text = response.text();
    
    this.logger.debug(`Gemini response: ${text.substring(0, 500)}...`);
    return text;
  }

  /**
   * Parse the response from Gemini model
   */
  private parseResponse(responseText: string): Record<string, any> | null {
    try {
      // Gemini typically returns plain text, so we need to extract JSON from it
      return this.extractJsonFromText(responseText);
    } catch (parseError) {
      this.logger.debug('Failed to parse Gemini response');
      return null;
    }
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
