/**
 * Input for OCR mapping process
 */
export interface OcrMappingInput {
  text: string;
  docType: string;
  docSubType: string;
}

/**
 * Result of OCR mapping process
 */
export interface OcrMappingResult {
  mapped_data: Record<string, any>;
  missing_fields: string[];
  confidence: number; // 0 to 1
  processing_method: 'ai' | 'keyword' | 'hybrid';
  warnings?: string[];
  isValidDocument?: boolean; // Document type validation result from LLM semantic analysis
}

/**
 * Interface for AI adapters (Bedrock, etc.)
 */
export interface IAiMappingAdapter {
  /**
   * Map extracted text to structured data using AI
   * @param extractedText - Raw text from OCR
   * @param schema - Target JSON schema
   * @param expectedDocumentName - Expected document type name for validation
   * @param docType - Optional document type for context-specific processing
   * @returns Mapped data object with isValidDocument field, or null if failed
   */
  mapTextToSchema(extractedText: string, schema: Record<string, any>, expectedDocumentName: string, docType?: string): Promise<Record<string, any> | null>;
  
  /**
   * Check if the adapter is properly configured
   * @returns True if adapter can be used
   */
  isConfigured(): boolean;
}
