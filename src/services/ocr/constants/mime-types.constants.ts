/**
 * Centralized MIME type constants for OCR services
 * Prevents duplication and ensures consistency across all adapters
 */

export const SUPPORTED_IMAGE_TYPES: string[] = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
];

export const SUPPORTED_PDF_TYPES: string[] = ['application/pdf'];

export const SUPPORTED_OCR_TYPES: string[] = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_PDF_TYPES,
];

// Extended support for specific providers
export const GEMINI_SUPPORTED_TYPES: string[] = [
  ...SUPPORTED_OCR_TYPES,
  'image/webp',
  'image/heic',
  'image/heif',
];

export const QR_SUPPORTED_TYPES: string[] = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_PDF_TYPES,
];

export const TESSERACT_SUPPORTED_TYPES: string[] = [
  ...SUPPORTED_IMAGE_TYPES,
];
