import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFileStorageService } from '@services/storage-providers/file-storage.service.interface';
import { validateFileContent } from '../../common/helper/fileValidation';
import { UPLOAD_CONFIG } from '../../config/upload.config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'node:path';
import { DocumentMetadata, UploadResult } from './interfaces';

/**
 * Generic document upload service
 * Can be used by any module (users, admin, organizations, etc.)
 * Handles file validation, storage, and metadata extraction
 */
@Injectable()
export class DocumentUploadService {
  private readonly logger = new Logger(DocumentUploadService.name);

  constructor(
    @Inject('FileStorageService')
    private readonly fileStorageService: IFileStorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generic file upload method - can be used by any module
   * @param file The file to upload
   * @param metadata Document metadata (type, subtype, name, etc.)
   * @param ownerId The ID of the entity that owns this document (user_id, org_id, etc.)
   * @returns Upload result with file path and metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    metadata: DocumentMetadata,
    ownerId: string,
    maxFileSize?: number,
  ): Promise<UploadResult> {
    let uploadedPath: string | null = null;

    try {
      // Validate file availability
      this.validateFilePresence(file);

      // Validate file content using magic numbers
      await validateFileContent(file.buffer);

      // Extract and validate file metadata
      const { fileExtension, docDatatype } =
        this.extractAndValidateFileMetadata(file, maxFileSize);

      // Build file key and upload - pass metadata to determine if it's a profile picture
      const fileKey = this.buildFileKey(ownerId, fileExtension, metadata);
      uploadedPath = await this.fileStorageService.uploadFile(
        fileKey,
        file.buffer,
        false,
      );

      if (!uploadedPath) {
        throw new InternalServerErrorException('Failed to upload file to storage');
      }

      this.logger.log(`File uploaded successfully to: ${uploadedPath}`);

      // For profile pictures, return only the relative path for database storage
      const isProfilePicture = metadata?.docType === 'profile' && metadata?.docSubType === 'picture';
      let dbFilePath = uploadedPath;
      
      if (isProfilePicture) {
        const profilePicturePrefix = this.configService.get<string>(
          'AWS_S3_PROFILE_PICTURE_PREFIX',
          'user-profile-pictures',
        );
        // Remove the profile picture prefix from the path for database storage
        dbFilePath = uploadedPath.replace(`${profilePicturePrefix}/`, '');
      }

      return {
        filePath: dbFilePath,
        fileExtension,
        docDatatype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      // Cleanup on failure
      if (uploadedPath) {
        await this.cleanupFailedUpload(uploadedPath);
      }
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param filePath Path to the file to delete
   * @returns True if deleted successfully, false otherwise
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const deleted = await this.fileStorageService.deleteFile(filePath);
      if (deleted) {
        this.logger.log(`Deleted file from storage: ${filePath}`);
      } else {
        this.logger.warn(`Could not delete file from storage: ${filePath}`);
      }
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete file from storage: ${error}`);
      return false;
    }
  }

  /**
   * Generate a temporary download URL (for S3) or return path (for local)
   * @param filePath Path to the file
   * @returns Download URL or file path
   */
  async generateDownloadUrl(filePath: string): Promise<string | null> {
    if (!filePath) {
      return null;
    }

    const storageProvider = this.configService.get<string>(
      'FILE_STORAGE_PROVIDER',
      'local',
    );

    if (storageProvider === 's3') {
      try {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        return (
          (await this.fileStorageService.generateTemporaryUrl?.(
            filePath,
            expiresAt,
          )) || null
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate pre-signed URL for ${filePath}:`,
          error,
        );
        return null;
      }
    }

    return filePath; // For local storage
  }

  /**
   * Validate file signature using magic numbers
   * Prevents file type spoofing by checking actual file content
   * @param buffer File buffer to validate
   * @param filename Original filename for logging
   */
  validateFileSignature(buffer: Buffer, filename: string): void {
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException(
        'Invalid file: file is too small or corrupted',
      );
    }

    const firstBytes = buffer.subarray(0, 8);

    // PDF signature: %PDF (hex: 25504446)
    if (
      firstBytes[0] === 0x25 &&
      firstBytes[1] === 0x50 &&
      firstBytes[2] === 0x44 &&
      firstBytes[3] === 0x46
    ) {
      return; // Valid PDF
    }

    // JPEG signature: FFD8FF
    if (
      firstBytes[0] === 0xff &&
      firstBytes[1] === 0xd8 &&
      firstBytes[2] === 0xff
    ) {
      return; // Valid JPEG
    }

    // PNG signature: 89504E47
    if (
      firstBytes[0] === 0x89 &&
      firstBytes[1] === 0x50 &&
      firstBytes[2] === 0x4e &&
      firstBytes[3] === 0x47
    ) {
      return; // Valid PNG
    }

    // If none of the signatures match, throw an error
    const detectedHex = firstBytes.subarray(0, 4).toString('hex').toUpperCase();
    throw new BadRequestException(
      `Invalid file signature for ${filename}. Expected PDF, JPEG, or PNG but detected signature: ${detectedHex}`,
    );
  }

  // Private helper methods

  /**
   * Validate that a file is present and has required properties
   */
  private validateFilePresence(file: Express.Multer.File): void {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('No file uploaded');
    }
  }

  /**
   * Extract and validate file metadata (extension, type, size)
   */
  private extractAndValidateFileMetadata(
    file: Express.Multer.File,
    maxFileSize?: number,
  ): {
    fileExtension: string;
    docDatatype: string;
  } {
    const allowedMimes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]);
    const allowedExts = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (
      !allowedExts.has(fileExtension) ||
      (file.mimetype && !allowedMimes.has(file.mimetype))
    ) {
      throw new BadRequestException('Unsupported file type');
    }

    const fileSizeLimit = maxFileSize || UPLOAD_CONFIG.maxFileSize;
    if (file.size && file.size > fileSizeLimit) {
      throw new BadRequestException('File too large');
    }

    // Validate file signature
    this.validateFileSignature(file.buffer, file.originalname);

    let docDatatype = 'Unknown';
    switch (fileExtension) {
      case '.pdf':
        docDatatype = 'PDF';
        break;
      case '.jpg':
      case '.jpeg':
        docDatatype = 'JPEG';
        break;
      case '.png':
        docDatatype = 'PNG';
        break;
    }

    return { fileExtension, docDatatype };
  }

  /**
   * Build a unique file key for storage
   */
  private buildFileKey(ownerId: string, fileExtension: string, metadata?: DocumentMetadata): string {
    const filePrefix = this.configService.get<string>(
      'FILE_PREFIX_ENV',
      'local',
    );
    
    // Check if this is a profile picture upload
    const isProfilePicture = metadata?.docType === 'profile' && metadata?.docSubType === 'picture';
    
    if (isProfilePicture) {
      const profilePicturePrefix = this.configService.get<string>(
        'AWS_S3_PROFILE_PICTURE_PREFIX',
        'user-profile-pictures',
      );
      // Upload with profile picture prefix but return relative path for database
      return `${profilePicturePrefix}/${filePrefix}/${ownerId}/${uuidv4()}${fileExtension}`;
    }
    
    // Default behavior for all other documents
    return `${filePrefix}/${ownerId}/${uuidv4()}${fileExtension}`;
  }

  /**
   * Cleanup a file after a failed upload
   */
  private async cleanupFailedUpload(filePath: string): Promise<void> {
    try {
      await this.fileStorageService.deleteFile(filePath);
    } catch (cleanupError) {
      this.logger.warn(
        `Failed to clean up uploaded file ${filePath}: ${cleanupError}`,
      );
    }
  }
}

