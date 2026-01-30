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

export type BedrockModelType = 'claude' | 'openai' | 'llama';

export interface BedrockModelConfig {
  modelId: string;                  // AWS Bedrock model identifier
  modelType: BedrockModelType;      // Detected model family
  temperature: number;              // Randomness control (0.0-1.0)
  maxTokens: number;                // Maximum response tokens
  maxGenLen: number;                // Maximum generation length (Llama-specific)
  topP: number;                     // Nucleus sampling parameter
  timeout: number;                  // Request timeout in milliseconds
  anthropicVersion?: string;        // Optional: Only required for Claude models
}

/**
 * Detect model family from model ID using prefix matching
 * New versions automatically work (e.g., claude-5, gpt-6, llama4)
 */
function detectModelFamily(modelId: string): BedrockModelType {
  const id = modelId.toLowerCase();
  
  if (id.startsWith('anthropic.claude')) return 'claude';
  if (id.startsWith('openai.gpt')) return 'openai';
  if (id.startsWith('meta.llama')) return 'llama';
  
  // Default fallback to llama format
  return 'llama';
}

/**
 * Get optimal defaults based on model family
 * To support new model family: add case here + buildRequest() in adapter
 */
function getModelDefaults(modelFamily: BedrockModelType) {
  const defaults: Record<BedrockModelType, { maxTokens: number; temperature: number; topP: number; anthropicVersion?: string }> = {
    claude: {
      maxTokens: 4096,
      temperature: 0.1,
      topP: 0.9,
      anthropicVersion: 'bedrock-2023-05-31',
    },
    openai: {
      maxTokens: 4096, //change to 2048 or 4096 or 8,192  as needed
      temperature: 0.1,
      topP: 0.9,
    },
    llama: {
      maxTokens: 2048,
      temperature: 0.1,
      topP: 0.9,
    },
  };
  
  return defaults[modelFamily];
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

// AWS Bedrock configurations for OCR and mapping
// Supports multiple models: Claude, OpenAI, Llama - just change OCR_MAPPING_BEDROCK_MODEL_ID
// Model-specific parameters are automatically configured
export const BEDROCK_CONFIG = {
  ocr: (() => {
    const modelId = process.env.OCR_BEDROCK_MODEL_ID || 'meta.llama3-8b-instruct-v1:0';
    const modelType = detectModelFamily(modelId);
    const defaults = getModelDefaults(modelType);
    
    return {
      modelId,
      modelType,
      temperature: 0.1,
      maxTokens: 2048,
      maxGenLen: 2048,
      topP: 1,
      timeout: 60000,
      ...(defaults.anthropicVersion && { anthropicVersion: defaults.anthropicVersion }),
    };
  })(),
  
  mapping: (() => {
    const modelId = process.env.OCR_MAPPING_BEDROCK_MODEL_ID || 'meta.llama3-8b-instruct-v1:0';
    const modelType = detectModelFamily(modelId);
    const defaults = getModelDefaults(modelType);
    
    return {
      modelId,
      modelType,
      temperature: defaults.temperature,
      maxTokens: defaults.maxTokens,
      maxGenLen: defaults.maxTokens, // Use same value for Llama compatibility
      topP: defaults.topP,
      timeout: 30000,
      ...(defaults.anthropicVersion && { anthropicVersion: defaults.anthropicVersion }),
    };
  })(),
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
