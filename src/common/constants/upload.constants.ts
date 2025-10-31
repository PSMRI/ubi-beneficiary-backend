/**
 * Centralized file upload configuration constants
 * All file upload limits and settings should be defined here to maintain consistency
 */

// File size limits (in bytes)
export const FILE_UPLOAD_LIMITS = {
  // Maximum file size: 5MB
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  // Maximum field value size: 2MB
  MAX_FIELD_SIZE: 2 * 1024 * 1024,
  
  // Maximum field name size: 100 bytes
  MAX_FIELD_NAME_SIZE: 100,
  
  // Maximum number of files per upload
  MAX_FILES: 1,
  
  // Maximum number of non-file fields
  MAX_FIELDS: 10,
  
  // Maximum number of header pairs
  MAX_HEADER_PAIRS: 2000,
  
  // Maximum number of parts (multipart data)
  MAX_PARTS: 1000,
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ] as string[],
  
  // File extension pattern for validation
  EXTENSION_PATTERN: /(pdf|jpeg|jpg|png)$/,
} as const;

// File upload error messages
export const FILE_UPLOAD_ERRORS = {
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.',
  FILE_TOO_LARGE: `File size exceeds the maximum limit of ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
  UPLOAD_FAILED: 'An error occurred while uploading the document',
} as const;