import { ITextExtractor } from '../interfaces/text-extractor.interface';
import { AWSTextractAdapter } from '../adapters/extractors/aws-textract.adapter';
import { GoogleGeminiAdapter } from '../adapters/extractors/google-gemini.adapter';

/**
 * Factory for creating text extractor instances
 * Supports AWS Textract and Google Gemini API
 */
export class TextExtractorFactory {
  /**
   * Create a text extractor based on provider name
   * @param provider - Provider name ('aws-textract' or 'google-gemini')
   * @param config - Provider-specific configuration
   * @returns Text extractor instance
   * @throws Error if provider is not supported
   */
  static create(provider: string, config: any): ITextExtractor {
    const normalizedProvider = provider.toLowerCase().trim();

    if (normalizedProvider === 'aws-textract') {
      return new AWSTextractAdapter({
        region: config.region || process.env.AWS_TEXTRACT_AWS_REGION,
        credentials: {
          accessKeyId: config.credentials?.accessKeyId || process.env.AWS_TEXTRACT_ACCESS_KEY_ID,
          secretAccessKey: config.credentials?.secretAccessKey || process.env.AWS_TEXTRACT_SECRET_ACCESS_KEY,
        },
      });
    }

    if (normalizedProvider === 'google-gemini' || normalizedProvider === 'gemini') {
      return new GoogleGeminiAdapter({
        apiKey: config.apiKey || process.env.GEMINI_API_KEY,
      });
    }

    throw new Error(`Unsupported text extraction provider: ${provider}. Supported providers: aws-textract, google-gemini`);
  }

  /**
   * Get list of supported providers
   * @returns Array of supported provider names
   */
  static getSupportedProviders(): string[] {
    return ['aws-textract', 'google-gemini'];
  }

  /**
   * Check if a provider is supported
   * @param provider - Provider name to check
   * @returns true if supported, false otherwise
   */
  static isProviderSupported(provider: string): boolean {
    return this.getSupportedProviders().includes(provider.toLowerCase().trim());
  }
}
