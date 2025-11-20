/**
 * File Upload Configuration
 * Centralized upload configuration with environment variable support
 */

export interface UploadConfig {
  maxFileSize: number;             // Maximum file size (in bytes) - used for both files and form fields
  maxFieldNameSize: number;        // Maximum field name size
  maxFiles: number;                // Maximum number of files per upload
  maxFields: number;               // Maximum number of non-file fields
  maxHeaderPairs: number;          // Maximum number of header pairs
  maxParts: number;                // Maximum number of parts (multipart data)
}

// Upload configuration with environment variable support
export const UPLOAD_CONFIG = {
  // Maximum file size (default: 5MB)
  // Can be overridden with FILE_UPLOAD_MAX_SIZE_MB environment variable (value in MB, e.g., 5, 10, 20)
  maxFileSize: (Number.parseInt(process.env.FILE_UPLOAD_MAX_SIZE_MB, 10) || 5) * 1024 * 1024,
  
  // Maximum field name size: 100 bytes
  maxFieldNameSize: 100,
  
  // Maximum number of files per upload
  maxFiles: 1,
  
  // Maximum number of non-file fields
  maxFields: 10,
  
  // Maximum number of header pairs
  maxHeaderPairs: 2000,
  
  // Maximum number of parts (multipart data)
  maxParts: 1000,
} as const;

// Allowed file types configuration
export const ALLOWED_FILE_TYPES = {
  MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ] as string[],
  
  // Content-based file type detection (matches file-type library output)
  CONTENT_TYPES: [
    'pdf',   // PDF files
    'jpg',   // JPEG files  
    'png',   // PNG files
  ] as string[],
  
  // File extension pattern for validation
  EXTENSION_PATTERN: /\.(pdf|jpeg|jpg|png)$/i,
} as const;

// File upload error messages
export const FILE_UPLOAD_ERRORS = {
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.',
  FILE_TOO_LARGE: `File size exceeds the maximum limit of ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB.`,
  UPLOAD_FAILED: 'An error occurred while uploading the document',
} as const;

// Configuration getter function
export function getUploadConfig(): UploadConfig {
  return UPLOAD_CONFIG;
}
