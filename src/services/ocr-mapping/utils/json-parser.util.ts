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
      return null;
    }

    let trimmedText = text.trim();
    
    // Try direct parsing first - AI should return clean JSON
    try {
      const parsed = JSON.parse(trimmedText);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Fallback to extraction
    }
    
    // Simple fallback: find first complete JSON object
    return this.extractFirstJsonObject(trimmedText);
  }

  /**
   * Extract first NON-EMPTY JSON object from text
   */
  private static extractFirstJsonObject(text: string): Record<string, any> | null {
    const startIndex = text.indexOf('{');
    if (startIndex === -1) {
      return null;
    }

    const endIndex = this.findMatchingCloseBrace(text, startIndex);
    if (endIndex === -1) {
      return null;
    }

    const jsonString = text.slice(startIndex, endIndex + 1);

    try {
      const parsed = JSON.parse(jsonString);
      
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    } catch {
      // Parse failed, continue
    }

    return null;
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
      // Not JSON, try text extraction
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
    
    if (hasKnownFields) {
      return null;
    } else {
      return parsed;
    }
  }
}
