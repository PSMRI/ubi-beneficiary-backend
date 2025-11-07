import { Logger } from '@nestjs/common';

/**
 * Common JSON parsing utility for AI responses
 */
export class JsonParserUtil {
  private static readonly logger = new Logger(JsonParserUtil.name);

  /**
   * Extract JSON object from AI response text using multiple strategies
   * @param text - Raw text response from AI model
   * @returns Parsed JSON object or null if extraction fails
   */
  static extractJsonFromText(text: string): Record<string, any> | null {
    if (!text || typeof text !== 'string') {
      this.logger.debug('Invalid input text for JSON extraction');
      return null;
    }

    try {
      this.logger.debug(`Attempting to extract JSON from text: ${text.substring(0, 200)}...`);
      
      return this.tryCodeBlockExtraction(text) ||
             this.tryJsonObjectExtraction(text) ||
             this.tryLargestJsonExtraction(text) ||
             this.tryBasicJsonExtraction(text);
      
    } catch (extractError) {
      this.logger.debug(`Failed to extract JSON from text: ${extractError}`);
    }
    
    return null;
  }

  /**
   * Try to extract JSON from markdown code blocks
   */
  private static tryCodeBlockExtraction(text: string): Record<string, any> | null {
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (codeBlockMatch?.[1]) {
      this.logger.debug('Found JSON in markdown code block');
      const jsonString = codeBlockMatch[1].trim();
      return JSON.parse(jsonString);
    }
    return null;
  }

  /**
   * Try to extract JSON after "Here is the JSON object:" pattern
   */
  private static tryJsonObjectExtraction(text: string): Record<string, any> | null {
    const jsonObjectMatch = text.match(/here is the json object:\s*```\s*(\{[\s\S]*?\})\s*```/i);
    if (jsonObjectMatch?.[1]) {
      this.logger.debug('Found JSON after "Here is the JSON object:"');
      const jsonString = jsonObjectMatch[1].trim();
      return JSON.parse(jsonString);
    }
    return null;
  }

  /**
   * Try to find the largest valid JSON object in the text
   */
  private static tryLargestJsonExtraction(text: string): Record<string, any> | null {
    const jsonMatches = text.match(/\{[\s\S]*?\}/g);
    if (!jsonMatches) {
      return null;
    }

    const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
    for (const match of sortedMatches) {
      try {
        const cleanedJson = match.trim();
        const parsed = JSON.parse(cleanedJson);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          this.logger.debug(`Successfully parsed JSON object with ${Object.keys(parsed).length} keys`);
          return parsed;
        }
      } catch {
        // Continue to next match
        continue;
      }
    }
    return null;
  }

  /**
   * Try basic JSON extraction using first { and last }
   */
  private static tryBasicJsonExtraction(text: string): Record<string, any> | null {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex >= 0 && endIndex > startIndex) {
      const jsonString = text.slice(startIndex, endIndex + 1);
      this.logger.debug(`Trying basic extraction: ${jsonString.substring(0, 100)}...`);
      return JSON.parse(jsonString);
    }
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
