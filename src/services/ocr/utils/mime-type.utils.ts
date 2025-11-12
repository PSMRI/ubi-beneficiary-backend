/**
 * MIME type utilities for OCR services
 * Provides normalization and validation functions
 */

import { SUPPORTED_OCR_TYPES, GEMINI_SUPPORTED_TYPES, QR_SUPPORTED_TYPES, TESSERACT_SUPPORTED_TYPES } from '../constants/mime-types.constants';

/**
 * MIME type normalization mapping
 * Generated dynamically from supported types to avoid duplication
 */
export const MIME_TYPE_NORMALIZER: Record<string, string> = (() => {
  const normalizer: Record<string, string> = {};
  
  // Add all Gemini supported types (includes all others)
  for (const mimeType of GEMINI_SUPPORTED_TYPES) {
    normalizer[mimeType.toLowerCase()] = mimeType;
  }
  
  // Handle jpg -> jpeg normalization
  normalizer['image/jpg'] = 'image/jpeg';
  
  return normalizer;
})();

/**
 * Normalize MIME type to standard format
 * @param mimeType - Input MIME type
 * @param defaultType - Default type if normalization fails
 * @returns Normalized MIME type
 */
export function normalizeMimeType(mimeType: string, defaultType = 'image/jpeg'): string {
  const normalized = mimeType.toLowerCase();
  return MIME_TYPE_NORMALIZER[normalized] || defaultType;
}

/**
 * Check if MIME type is supported by OCR services
 * @param mimeType - MIME type to check
 * @returns true if supported
 */
export function isOcrSupported(mimeType: string): boolean {
  return SUPPORTED_OCR_TYPES.includes(mimeType.toLowerCase() as any);
}

/**
 * Check if MIME type is supported by Gemini
 * @param mimeType - MIME type to check
 * @returns true if supported
 */
export function isGeminiSupported(mimeType: string): boolean {
  return GEMINI_SUPPORTED_TYPES.includes(mimeType.toLowerCase() as any);
}

/**
 * Check if MIME type is supported by QR detection
 * @param mimeType - MIME type to check
 * @returns true if supported
 */
export function isQrSupported(mimeType: string): boolean {
  return QR_SUPPORTED_TYPES.includes(mimeType.toLowerCase() as any);
}

/**
 * Check if MIME type is supported by Tesseract
 * @param mimeType - MIME type to check
 * @returns true if supported
 */
export function isTesseractSupported(mimeType: string): boolean {
  return TESSERACT_SUPPORTED_TYPES.includes(mimeType.toLowerCase() as any);
}

/**
 * Check if MIME type is an image type
 * @param mimeType - MIME type to check
 * @returns true if image type
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('image/');
}

/**
 * Check if MIME type is PDF
 * @param mimeType - MIME type to check
 * @returns true if PDF
 */
export function isPdfType(mimeType: string): boolean {
  return mimeType.toLowerCase() === 'application/pdf';
}

/**
 * Extension to MIME type mapping
 * Generated dynamically from supported types to avoid duplication
 */
const EXTENSION_TO_MIME_MAP: Record<string, string> = (() => {
  const extensionMap: Record<string, string> = {};
  
  // Generate from Gemini supported types (includes all others)
  for (const mimeType of GEMINI_SUPPORTED_TYPES) {
    const [type, subtype] = mimeType.split('/');
    if (type === 'image') {
      extensionMap[subtype] = mimeType;
      // Handle jpeg/jpg variation
      if (subtype === 'jpeg') {
        extensionMap['jpg'] = mimeType;
      }
    } else if (mimeType === 'application/pdf') {
      extensionMap['pdf'] = mimeType;
    }
  }
  
  return extensionMap;
})();

/**
 * Detect MIME type from URL extension
 * @param url - URL to analyze
 * @returns Detected MIME type or default
 */
export function detectMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  return EXTENSION_TO_MIME_MAP[extension || ''] || 'application/octet-stream';
}
