import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_FILE_TYPES, FILE_UPLOAD_ERRORS } from '../constants/upload.constants';

/**
 * Validates file content using magic number detection
 * This prevents file type spoofing by checking actual file content rather than client-provided MIME type
 * 
 * @param fileBuffer - The file buffer to validate
 * @returns Promise<void> - Resolves if file is valid, throws BadRequestException if invalid
 */
export async function validateFileContent(fileBuffer: Buffer): Promise<void> {
  try {
    // Detect file type from buffer content using magic numbers
    const fileType = await fileTypeFromBuffer(fileBuffer);
    
    // If file type cannot be detected, reject the file
    if (!fileType) {
      throw new BadRequestException(FILE_UPLOAD_ERRORS.INVALID_FILE_TYPE);
    }
    
    // Check if detected file type is in our allowed list
    if (!ALLOWED_FILE_TYPES.CONTENT_TYPES.includes(fileType.ext)) {
      throw new BadRequestException(FILE_UPLOAD_ERRORS.INVALID_FILE_TYPE);
    }
    
    // File is valid
    return;
  } catch (error) {
    // If it's already our BadRequestException, re-throw it
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    // For any other error during file type detection, treat as invalid file
    throw new BadRequestException(FILE_UPLOAD_ERRORS.INVALID_FILE_TYPE);
  }
}