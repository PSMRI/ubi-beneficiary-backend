/**
 * AI Model Configuration
 * Centralizes AI model configurations for OCR and mapping services.
 * 
 * For detailed parameter documentation, see: docs/AI_MODEL_PARAMETERS.md
 */

export interface AIModelConfig {
  model: string;                    // Gemini model name
  temperature: number;              // Randomness control (0.0-1.0)
  maxOutputTokens: number;          // Maximum response tokens
  timeout: number;                  // Request timeout in milliseconds
  topP?: number;                    // Nucleus sampling (0.0-1.0)
  topK?: number;                    // Top-K sampling limit
  validationTimeout?: number;       // Validation timeout (ms)
  validationMaxTokens?: number;     // Max tokens for validation
}

export interface BedrockModelConfig {
  modelId: string;                  // AWS Bedrock model identifier
  temperature: number;              // Randomness control (0.0-1.0)
  maxTokens: number;                // Maximum response tokens
  maxGenLen: number;                // Maximum generation length (Llama-specific)
  topP: number;                     // Nucleus sampling parameter
  timeout: number;                  // Request timeout in milliseconds
}


// Google Gemini configurations for OCR and mapping
export const GEMINI_CONFIG = {
  ocr: {
    model: process.env.GEMINI_OCR_MODEL || 'gemini-2.0-flash-exp',
    temperature: 0.1,        // Low randomness for consistent extraction
    maxOutputTokens: 8192,   // Handle long documents
    timeout: 60000,          // 60s for complex documents
    topK: 32,
    topP: 1,                 // Full probability mass for complete text
    validationTimeout: 10000,
    validationMaxTokens: 10,
  },
  
  mapping: {
    model: process.env.OCR_MAPPING_GEMINI_MODEL_NAME || 'gemini-1.5-flash',
    temperature: 0.1,        // Low randomness for consistent JSON
    maxOutputTokens: 2000,   // Sufficient for most JSON schemas
    timeout: 30000,          // 30s for mapping
    topK: 32,
    topP: 0.9,               // Focused output for better JSON structure
  },
} as const;

// AWS Bedrock (Llama) configurations for OCR and mapping
// NOTE: Llama 3 8B has a maximum of 2048 tokens for max_gen_len
export const BEDROCK_CONFIG = {
  ocr: {
    modelId: process.env.OCR_BEDROCK_MODEL_ID || 'meta.llama3-8b-instruct-v1:0',
    temperature: 0.1,        // Low randomness for consistent extraction
    maxTokens: 2048,
    maxGenLen: 2048,
    topP: 1,                 // Full sampling for complete text
    timeout: 60000,
  },
  
  mapping: {
    modelId: process.env.OCR_MAPPING_BEDROCK_MODEL_ID || 'meta.llama3-8b-instruct-v1:0',
    temperature: 0.1,        // Low randomness for consistent JSON
    maxTokens: 2048,        // Llama 3 8B maximum limit
    maxGenLen: 2048,        // Llama 3 8B maximum limit
    topP: 1,                // Full sampling for complete text
    timeout: 30000,
  },
} as const;

// Configuration getter functions
export function getGeminiOcrConfig(): AIModelConfig {
  return GEMINI_CONFIG.ocr;
}

export function getGeminiMappingConfig(): AIModelConfig {
  return GEMINI_CONFIG.mapping;
}

export function getBedrockOcrConfig(): BedrockModelConfig {
  return BEDROCK_CONFIG.ocr;
}

export function getBedrockMappingConfig(): BedrockModelConfig {
  return BEDROCK_CONFIG.mapping;
}
