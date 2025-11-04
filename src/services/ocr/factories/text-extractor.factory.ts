import { ITextExtractor } from '../interfaces/text-extractor.interface';
import { AWSTextractAdapter } from '../adapters/extractors/aws-textract.adapter';

/**
 * Factory for creating text extractor instances
 * Currently supports AWS Textract, with ability to add more providers in future
 */
export class TextExtractorFactory {
  /**
   * Create a text extractor based on provider name
   * @param provider - Provider name (currently only supports 'aws-textract')
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

    throw new Error(`Unsupported text extraction provider: ${provider}. Currently only AWS Textract is supported.`);
  }

  /**
   * Get list of supported providers
   * @returns Array of supported provider names
   */
  static getSupportedProviders(): string[] {
    return ['aws-textract'];
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
