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
    
    // Look for all JSON objects, skip empty ones
    while (currentIndex < text.length) {
      const startIndex = text.indexOf('{', currentIndex);
      if (startIndex === -1) break;
      
      // Find matching closing brace
      let braceCount = 0;
      let endIndex = -1;
      
      for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '{') braceCount++;
        if (text[i] === '}') braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
      
      if (endIndex === -1) {
        this.logger.debug('No matching closing brace found');
        break;
      }
      
      try {
        const jsonString = text.slice(startIndex, endIndex + 1);
        const parsed = JSON.parse(jsonString);
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          if (keys.length > 0) {
            this.logger.debug(`Found non-empty JSON with ${keys.length} keys: [${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`);
            return parsed;
          } else {
            this.logger.debug('Skipping empty JSON object, looking for next one...');
          }
        }
      } catch (error) {
        this.logger.debug(`Failed to parse JSON candidate: ${error}`);
      }
      
      currentIndex = endIndex + 1;
    }
    
    this.logger.debug('No valid non-empty JSON object found');
    return null;
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
