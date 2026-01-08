import { Injectable, Logger } from '@nestjs/common';
import { IFileStorageService } from '../file-storage.service.interface';
import { S3Client } from '@aws-sdk/client-s3';
import { AwsS3StorageAdapter } from '@flystorage/aws-s3';

import {
  UnableToWriteFile,
  UnableToReadFile,
  UnableToDeleteFile,
  UnableToMoveFile,
  UnableToCopyFile,
  UnableToGetPublicUrl,
  UnableToGetTemporaryUrl,
  FileStorage,
  Visibility
} from '@flystorage/file-storage';

@Injectable()
export class S3StorageAdapter implements IFileStorageService {
  private readonly storage: FileStorage;
  private readonly storageWithoutPrefix: FileStorage;
  private readonly logger = new Logger(S3StorageAdapter.name);

  constructor() {
    // Validate required environment variables
    const requiredEnvVars = ['AWS_S3_REGION', 'AWS_S3_ACCESS_KEY_ID', 'AWS_S3_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    const client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
      },
    });

    // Storage with global prefix (for regular documents)
    const adapter = new AwsS3StorageAdapter(client, {
      bucket: process.env.AWS_S3_BUCKET_NAME!,
      prefix: process.env.AWS_S3_PREFIX ?? '',
    });

    // Storage without prefix (for profile pictures and other special cases)
    const adapterWithoutPrefix = new AwsS3StorageAdapter(client, {
      bucket: process.env.AWS_S3_BUCKET_NAME!,
      prefix: '',
    });

    this.storage = new FileStorage(adapter);
    this.storageWithoutPrefix = new FileStorage(adapterWithoutPrefix);
  }

  async uploadFile(key: string, content: Buffer, isPublic = false): Promise<string | null> {
    try {
      // Check if this is a profile picture path that should bypass the global prefix
      const profilePicturePrefix = process.env.AWS_S3_PROFILE_PICTURE_PREFIX || 'user-profile-pictures';
      const isProfilePicture = key.startsWith(profilePicturePrefix + '/');
      
      const storage = isProfilePicture ? this.storageWithoutPrefix : this.storage;
      
      // Try to upload with the requested visibility
      let uploadedAsPublic = false;
      try {
        await storage.write(key, content, {
          visibility: isPublic ? Visibility.PUBLIC : Visibility.PRIVATE,
        });
        uploadedAsPublic = isPublic;
        if (isPublic) {
          this.logger.log(`File uploaded as PUBLIC: ${key}`);
        }
      } catch (aclError: any) {
        // Check for ACL-related errors (bucket ACLs disabled or IAM permissions)
        const errorMessage = aclError?.message || '';
        const isAclError = 
          errorMessage.includes('ACL') || 
          errorMessage.includes('bucket does not allow ACLs') ||
          errorMessage.includes('PutObjectAcl') ||
          errorMessage.includes('s3:PutObjectAcl') ||
          errorMessage.includes('not authorized to perform');
        
        if (isAclError && isPublic) {
          // If ACLs are disabled or IAM doesn't have ACL permissions, fallback to private upload
          // Public access can be handled via bucket policies or CloudFront
          this.logger.warn(
            `Cannot upload as PUBLIC (ACL/permission issue) - uploading as PRIVATE instead. ` +
            `Key: ${key}. ` +
            `Error: ${errorMessage.substring(0, 200)}. ` +
            `To enable public URLs, configure bucket policies to allow public read access (s3:GetObject). ` +
            `The generated public URL will only work if bucket policies allow public access.`,
          );
          await storage.write(key, content, {
            visibility: Visibility.PRIVATE,
          });
          uploadedAsPublic = false;
        } else if (isAclError && !isPublic) {
          // Even private upload failed with ACL error - this shouldn't happen, but handle it
          this.logger.warn(
            `ACL error on private upload, retrying: ${key}. Error: ${errorMessage.substring(0, 200)}`,
          );
          await storage.write(key, content, {
            visibility: Visibility.PRIVATE,
          });
        } else {
          // Re-throw if it's a different error
          throw aclError;
        }
      }
      
      // Log final upload status
      if (isPublic && !uploadedAsPublic) {
        this.logger.warn(
          `File uploaded as PRIVATE but public URL will be generated. ` +
          `Ensure bucket policies allow public read access for URL to work. Key: ${key}`,
        );
      }
      
      return key;
    } catch (err) {
      if (err instanceof UnableToWriteFile) {
        this.logger.error(`Unable to write file: ${key}`, err.stack);
      } else if (err instanceof UnableToGetPublicUrl) {
        this.logger.warn(`File written but public URL could not be generated: ${key}`);
      } else {
        this.logger.error(`Unexpected error writing file: ${key}`, err);
      }
      return null;
    }
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      // Check if this is a profile picture path that should bypass the global prefix
      const profilePicturePrefix = process.env.AWS_S3_PROFILE_PICTURE_PREFIX || 'user-profile-pictures';
      const isProfilePicture = key.startsWith(profilePicturePrefix + '/');
      
      const storage = isProfilePicture ? this.storageWithoutPrefix : this.storage;
      const stream = await storage.read(key);
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (err) {
      if (err instanceof UnableToReadFile) {
        this.logger.error(`Unable to read file: ${key}`, err.stack);
      } else {
        this.logger.error(`Unexpected error reading file: ${key}`, err);
      }
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      // Check if this is a profile picture path that should bypass the global prefix
      const profilePicturePrefix = process.env.AWS_S3_PROFILE_PICTURE_PREFIX || 'user-profile-pictures';
      const isProfilePicture = key.startsWith(profilePicturePrefix + '/');
      
      const storage = isProfilePicture ? this.storageWithoutPrefix : this.storage;
      await storage.deleteFile(key);
      return true;
    } catch (err) {
      if (err instanceof UnableToDeleteFile) {
        this.logger.error(`Unable to delete file: ${key}`, err.stack);
      } else {
        this.logger.error(`Unexpected error deleting file: ${key}`, err);
      }
      return false;
    }
  }

  async moveFile(fromKey: string, toKey: string, isPublic = false): Promise<boolean> {
    try {
      await this.storage.moveFile(fromKey, toKey, {
        visibility: isPublic ? Visibility.PUBLIC : Visibility.PRIVATE,
      });
      return true;
    } catch (err) {
      if (err instanceof UnableToMoveFile) {
        this.logger.error(`Unable to move file from ${fromKey} to ${toKey}`, err.stack);
      } else {
        this.logger.error(`Unexpected error moving file: ${fromKey}`, err);
      }
      return false;
    }
  }

  async copyFile(fromKey: string, toKey: string, isPublic = false): Promise<boolean> {
    try {
      await this.storage.copyFile(fromKey, toKey, {
        visibility: isPublic ? Visibility.PUBLIC : Visibility.PRIVATE,
      });
      return true;
    } catch (err) {
      if (err instanceof UnableToCopyFile) {
        this.logger.error(`Unable to copy file from ${fromKey} to ${toKey}`, err.stack);
      } else {
        this.logger.error(`Unexpected error copying file: ${fromKey}`, err);
      }
      return false;
    }
  }

  async generateTemporaryUrl(key: string, expiresAt?: Date): Promise<string | null> {
    try {
      // Use provided expiry or default to 20 minutes
      const defaultExpiry = new Date(Date.now() + 20 * 60 * 1000);
      const options = { expiresAt: (expiresAt || defaultExpiry).getTime() };
      
      // Check if this is a profile picture path that should bypass the global prefix
      const profilePicturePrefix = process.env.AWS_S3_PROFILE_PICTURE_PREFIX || 'user-profile-pictures';
      const isProfilePicture = key.startsWith(profilePicturePrefix + '/');
      
      if (isProfilePicture) {
        // Use storage without prefix for profile pictures
        return await this.storageWithoutPrefix.temporaryUrl(key, options);
      } else {
        // Use regular storage with prefix for other documents
        return await this.storage.temporaryUrl(key, options);
      }
    } catch (err) {
      if (err instanceof UnableToGetTemporaryUrl) {
        this.logger.error(`Unable to generate temporary URL for ${key}`, err.stack);
      } else {
        this.logger.error(`Unexpected error generating temporary URL: ${key}`, err);
      }
      return null;
    }
  }

  async generatePublicUrl(key: string): Promise<string | null> {
    try {
      // Check if this is a profile picture path that should bypass the global prefix
      const profilePicturePrefix = process.env.AWS_S3_PROFILE_PICTURE_PREFIX || 'user-profile-pictures';
      const isProfilePicture = key.startsWith(profilePicturePrefix + '/');
      
      let publicUrl: string;
      
      if (isProfilePicture) {
        // Use storage without prefix for profile pictures
        publicUrl = await this.storageWithoutPrefix.publicUrl(key);
      } else {
        // Use regular storage with prefix for other documents
        publicUrl = await this.storage.publicUrl(key);
      }
      
      // Note: This URL will only work if bucket policies allow public read access
      // Since ACLs are disabled, files are uploaded as private
      // Bucket policies must be configured to allow: s3:GetObject for public access
      return publicUrl;
    } catch (err) {
      // If publicUrl fails, manually construct the URL as fallback
      // This assumes bucket policies allow public access
      if (err instanceof UnableToGetPublicUrl) {
        this.logger.warn(
          `publicUrl method failed, constructing URL manually. Ensure bucket policies allow public read access. Key: ${key}`,
        );
        
        // Manually construct S3 public URL
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_S3_REGION;
        
        if (bucketName && region) {
          // Construct URL: https://bucket-name.s3.region.amazonaws.com/key
          // For us-east-1, use s3.amazonaws.com; for other regions use s3.region.amazonaws.com
          const s3Domain = region === 'us-east-1' 
            ? 's3.amazonaws.com'
            : `s3.${region}.amazonaws.com`;
          
          // URL encode the key to handle special characters
          const encodedKey = encodeURIComponent(key).replaceAll('%2F', '/');
          
          return `https://${bucketName}.${s3Domain}/${encodedKey}`;
        }
        
        this.logger.error(`Unable to generate public URL for ${key}`, err.stack);
      } else {
        this.logger.error(`Unexpected error generating public URL: ${key}`, err);
      }
      return null;
    }
  }
}
