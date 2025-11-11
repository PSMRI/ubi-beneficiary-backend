import { buildOcrMappingPrompt } from '../../../config/prompts.config';

/**
 * Common prompt builder utility for AI-based OCR text mapping
 * @deprecated Use buildOcrMappingPrompt from prompts.config.ts instead
 */
export class PromptBuilderUtil {
  /**
   * Build a standardized prompt for AI models to map extracted text to JSON schema
   * @param extractedText - Raw text extracted from document
   * @param schema - Target JSON schema for mapping (vcFields)
   * @param docType - Optional document type for context (unused in new implementation)
   * @returns Formatted prompt string
   * @deprecated Use buildOcrMappingPrompt from prompts.config.ts instead
   */
  static buildMappingPrompt(
    extractedText: string, 
    schema: Record<string, any>, 
    docType?: string
  ): string {
    return buildOcrMappingPrompt(extractedText, schema);
  }
}
