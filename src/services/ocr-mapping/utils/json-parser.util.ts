import { Logger } from '@nestjs/common';

/**
 * Simplified JSON parsing utility for AI responses
 * Optimized for the new simplified prompts that request raw JSON only
 */
export class JsonParserUtil {
  private static readonly logger = new Logger(JsonParserUtil.name);

  /**
   * Extract JSON object from AI response text - MINIMAL processing
   * Let AI handle all mapping logic, parser just extracts valid JSON
   * @param text - Raw text response from AI model
   * @returns Parsed JSON object or null if extraction fails
   */
  static extractJsonFromText(text: string): Record<string, any> | null {
    if (!text || typeof text !== 'string') {
      this.logger.debug('Invalid input text for JSON extraction');
      return null;
    }

    const trimmedText = text.trim();
    this.logger.debug(`Attempting to extract JSON from text: ${trimmedText.substring(0, 200)}...`);
    
    // Try direct parsing first - AI should return clean JSON
    try {
      const parsed = JSON.parse(trimmedText);
      if (parsed && typeof parsed === 'object') {
        this.logger.debug(`Successfully parsed JSON directly with ${Object.keys(parsed).length} keys`);
        return parsed;
      }
    } catch (directError) {
      this.logger.debug(`Direct parsing failed: ${directError}, trying extraction...`);
    }
    
    // Simple fallback: find first complete JSON object
    return this.extractFirstJsonObject(trimmedText);
  }

  /**
   * Extract first NON-EMPTY JSON object - skip empty {} objects
   * AI sometimes returns empty {} followed by actual data
   */
  private static extractFirstJsonObject(text: string): Record<string, any> | null {
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      const jsonBounds = this.findJsonBounds(text, currentIndex);
      if (!jsonBounds) break;
      
      const parsedJson = this.tryParseJsonAtBounds(text, jsonBounds);
      if (parsedJson) {
        return parsedJson;
      }
      
      currentIndex = jsonBounds.endIndex + 1;
    }
    
    this.logger.debug('No valid non-empty JSON object found');
    return null;
  }

  /**
   * Find the start and end indices of a JSON object
   */
  private static findJsonBounds(text: string, startFrom: number): { startIndex: number; endIndex: number } | null {
    const startIndex = text.indexOf('{', startFrom);
    if (startIndex === -1) return null;
    
    const endIndex = this.findMatchingCloseBrace(text, startIndex);
    if (endIndex === -1) {
      this.logger.debug('No matching closing brace found');
      return null;
    }
    
    return { startIndex, endIndex };
  }

  /**
   * Find the matching closing brace for an opening brace
   */
  private static findMatchingCloseBrace(text: string, startIndex: number): number {
    let braceCount = 0;
    
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Try to parse JSON at the given bounds and return if non-empty
   */
  private static tryParseJsonAtBounds(text: string, bounds: { startIndex: number; endIndex: number }): Record<string, any> | null {
    try {
      const jsonString = text.slice(bounds.startIndex, bounds.endIndex + 1);
      const parsed = JSON.parse(jsonString);
      
      if (parsed && typeof parsed === 'object') {
        return this.validateAndReturnNonEmptyJson(parsed);
      }
    } catch (error) {
      this.logger.debug(`Failed to parse JSON candidate: ${error}`);
    }
    
    return null;
  }

  /**
   * Validate JSON object and return only if it has content
   */
  private static validateAndReturnNonEmptyJson(parsed: Record<string, any>): Record<string, any> | null {
    const keys = Object.keys(parsed);
    
    if (keys.length > 0) {
      this.logger.debug(`Found non-empty JSON with ${keys.length} keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
      return parsed;
    } else {
      this.logger.debug('Skipping empty JSON object, looking for next one...');
      return null;
    }
  }

  /**
   * Parse AI model response and extract JSON from various response formats
   * @param responseBody - Raw response body from AI model
   * @param modelType - Type of AI model ('bedrock' | 'gemini')
   * @returns Parsed JSON object or null if parsing fails
   */
  static parseAiResponse(responseBody: string, modelType: 'bedrock' | 'gemini'): Record<string, any> | null {
    if (!responseBody || typeof responseBody !== 'string') {
      this.logger.debug('Invalid response body for parsing');
      return null;
    }

    if (modelType === 'gemini') {
      return this.extractJsonFromText(responseBody);
    }

    return this.parseBedrockResponse(responseBody);
  }

  /**
   * Parse Bedrock-specific response formats
   */
  private static parseBedrockResponse(responseBody: string): Record<string, any> | null {
    try {
      const parsed = JSON.parse(responseBody);
      
      if (parsed && typeof parsed === 'object') {
        return this.extractFromBedrockFormats(parsed);
      }
    } catch {
      this.logger.debug('Failed to parse response as JSON, trying to extract JSON substring');
    }

    return this.extractJsonFromText(responseBody);
  }

  /**
   * Extract JSON from various Bedrock model response formats
   */
  private static extractFromBedrockFormats(parsed: any): Record<string, any> | null {
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
    const knownFields = ['generated_text', 'completion', 'generation', 'content', 'results'];
    const hasKnownFields = knownFields.some(field => field in parsed);
    
    return hasKnownFields ? null : parsed;
  }
}
