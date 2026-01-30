/**
 * Centralized error handler for OCR services
 * Provides consistent error handling across all OCR providers
 */

export type OcrProvider = 'aws-textract' | 'google-gemini' | 'tesseract';
export type MappingProvider = 'bedrock' | 'gemini';

/**
 * Common OCR error handler
 * @param error - The error object
 * @param provider - The OCR provider that threw the error
 * @throws Standardized error with user-friendly message
 */
export function handleOcrError(error: any, provider: OcrProvider): never {
  // Common network/timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    throw new Error('OCR_TIMEOUT');
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    throw new Error('OCR_NETWORK_ERROR');
  }

  // Provider-specific error handling
  switch (provider) {
    case 'aws-textract':
      handleAwsTextractError(error);
      break;
    case 'google-gemini':
      handleGeminiError(error);
      break;
    case 'tesseract':
      handleTesseractError(error);
      break;
    default:
      throw new Error('OCR_TEXT_EXTRACTION_FAILED');
  }
}

/**
 * Handle AWS Textract specific errors
 */
function handleAwsTextractError(error: any): never {
  if (error.name === 'AccessDeniedException') {
    throw new Error('OCR_NOT_CONFIGURED');
  }

  if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidDocumentException') {
    throw new Error('OCR_UNSUPPORTED_FORMAT');
  }

  if (error.name === 'ThrottlingException') {
    throw new Error('OCR_SERVICE_BUSY');
  }

  if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
    throw new Error('OCR_INVALID_CREDENTIALS');
  }

  if (error.name === 'ExpiredToken') {
    throw new Error('OCR_CREDENTIALS_EXPIRED');
  }

  if (error.name === 'UnknownEndpoint') {
    throw new Error('OCR_INVALID_REGION');
  }

  throw new Error('OCR_TEXT_EXTRACTION_FAILED');
}

/**
 * Handle Google Gemini specific errors
 */
function handleGeminiError(error: any): never {
  if (error.response?.status === 400) {
    const msg = error.response.data?.error?.message || '';
    if (msg.includes('API key not valid')) {
      throw new Error('OCR_GEMINI_INVALID_KEY');
    }
    if (msg.includes('unsupported MIME type')) {
      throw new Error('OCR_GEMINI_UNSUPPORTED_FORMAT');
    }
    throw new Error('OCR_GEMINI_INVALID_REQUEST');
  }

  if (error.response?.status === 403) {
    throw new Error('OCR_GEMINI_ACCESS_DENIED');
  }

  if (error.response?.status === 429) {
    throw new Error('OCR_GEMINI_RATE_LIMIT');
  }

  if (error.response?.status === 500 || error.response?.status === 503) {
    throw new Error('OCR_GEMINI_SERVICE_UNAVAILABLE');
  }

  throw new Error('OCR_GEMINI_PROCESSING_FAILED');
}

/**
 * Handle Tesseract specific errors
 */
function handleTesseractError(error: any): never {
  if (error.message?.includes('Invalid image format')) {
    throw new Error('OCR_TESSERACT_UNSUPPORTED_FORMAT');
  }

  if (error.message?.includes('Image too large')) {
    throw new Error('OCR_TESSERACT_FILE_TOO_LARGE');
  }

  throw new Error('OCR_TESSERACT_PROCESSING_FAILED');
}

/**
 * Handle AI mapping errors
 * @param error - The error object
 * @param provider - The mapping provider that threw the error
 * @throws Standardized error with user-friendly message
 */
export function handleMappingError(error: any, provider: MappingProvider): never {
  // Common network/timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    throw new Error('OCR_MAPPING_TIMEOUT');
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    throw new Error('OCR_MAPPING_NETWORK_ERROR');
  }

  // Provider-specific error handling
  switch (provider) {
    case 'bedrock':
      handleBedrockError(error);
      break;
    case 'gemini':
      handleGeminiMappingError(error);
      break;
    default:
      throw new Error('OCR_MAPPING_PROCESSING_FAILED');
  }
}

/**
 * Handle AWS Bedrock specific errors
 */
function handleBedrockError(error: any): never {
  if (error.name === 'AccessDeniedException') {
    throw new Error('OCR_BEDROCK_NOT_CONFIGURED');
  }

  if (error.name === 'ThrottlingException') {
    throw new Error('OCR_BEDROCK_SERVICE_BUSY');
  }

  if (error.name === 'ValidationException') {
    throw new Error('OCR_BEDROCK_INVALID_REQUEST');
  }

  if (error.name === 'ModelNotReadyException') {
    throw new Error('OCR_BEDROCK_MODEL_NOT_READY');
  }

  throw new Error('OCR_BEDROCK_PROCESSING_FAILED');
}

/**
 * Handle Gemini mapping specific errors
 */
function handleGeminiMappingError(error: any): never {
  if (error.response?.status === 400) {
    const msg = error.response.data?.error?.message || '';
    if (msg.includes('API key not valid')) {
      throw new Error('Gemini API key is invalid for mapping service.');
    }
    throw new Error('Invalid request to Gemini mapping service. Please try again.');
  }

  if (error.response?.status === 403) {
    throw new Error('Gemini mapping service access denied. Please check API key permissions.');
  }

  if (error.response?.status === 429) {
    throw new Error('Gemini mapping service rate limit exceeded. Please try again later.');
  }

  if (error.response?.status === 500 || error.response?.status === 503) {
    throw new Error('Gemini mapping service is temporarily unavailable. Please try again later.');
  }

  throw new Error('Unable to process document mapping with Gemini. Please try again.');
}

/**
 * Handle validation errors for AI services
 * @param error - The error object
 * @param provider - The provider being validated
 * @throws Standardized error with user-friendly message
 */
export function handleValidationError(error: any, provider: OcrProvider | MappingProvider): never {
  if (error.name === 'AccessDeniedException' || error.response?.status === 403) {
    throw new Error(`${provider} service not properly configured. Please contact support.`);
  }

  if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('API key not valid')) {
    throw new Error(`${provider} API key is invalid. Please check your configuration.`);
  }

  if (error.response?.status === 429) {
    throw new Error(`${provider} API rate limit exceeded. Please try again later.`);
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    throw new Error(`${provider} API connection timeout. Please check your internet connection.`);
  }

  // For credential errors
  if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
    throw new Error(`${provider} service credentials are invalid. Please check configuration.`);
  }

  if (error.name === 'ExpiredToken') {
    throw new Error(`${provider} service credentials have expired. Please update credentials.`);
  }

  // For region errors
  if (error.name === 'UnknownEndpoint') {
    throw new Error(`${provider} service region configuration is invalid. Please check region setting.`);
  }

  // For document validation errors that indicate valid permissions
  if (error.name === 'InvalidDocumentException' || error.name === 'InvalidImageFormatException') {
    // These errors mean we have valid permissions, just invalid test data
    throw new Error(`${provider} service received invalid document format. Please check the document and try again.`);
  }

  throw new Error(`${provider} service configuration error: ${error.name}. Please try again later.`);
}
