/**
 * Extracted text result from OCR processing
 */
export interface ExtractedText {
  /** The full extracted text from the document */
  fullText: string;
  
  /** Confidence score of the extraction (0-100) */
  confidence?: number;
  
  /** Additional metadata about the extraction */
  metadata?: {
    /** Number of pages processed */
    pageCount?: number;
    
    /** Detected language */
    language?: string;
    
    /** Time taken to process (in milliseconds) */
    processingTime?: number;
    
    /** Additional provider-specific metadata */
    [key: string]: any;
  };
}

/**
 * Configuration for text extractor
 */
export interface TextExtractorConfig {
  /** Provider name (e.g., 'aws-textract', 'google-vision') */
  provider: string;
  
  /** Provider-specific credentials */
  credentials?: any;
  
  /** Additional provider-specific options */
  options?: any;
}

/**
 * Interface for text extraction from documents
 * Implementations should be provider-agnostic
 */
export interface ITextExtractor {
  /**
   * Extract text from a document
   * @param fileBuffer - Document buffer (image, PDF, etc.)
   * @param mimeType - MIME type of the document
   * @returns Extracted text with metadata
   */
  extractText(fileBuffer: Buffer, mimeType: string): Promise<ExtractedText>;

  /**
   * Check if the provider supports this file type
   * @param mimeType - MIME type to check
   * @returns true if supported, false otherwise
   */
  supportsFileType(mimeType: string): boolean;

  /**
   * Get provider name
   * @returns Name of the extraction provider
   */
  getProviderName(): string;

  /**
   * Validate provider permissions
   * @returns true if permissions are valid
   * @throws Error if permissions are invalid
   */
  validatePermissions(): Promise<boolean>;
}
