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
  private readonly logger = new Logger(S3StorageAdapter.name);

  constructor() {
    // Validate required environment variables
    const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    const client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const adapter = new AwsS3StorageAdapter(client, {
      bucket: process.env.AWS_S3_BUCKET_NAME!,
      prefix: process.env.AWS_PREFIX ?? '',
    });

    this.storage = new FileStorage(adapter);
  }

  async uploadFile(key: string, content: Buffer, isPublic = false): Promise<string | null> {
    try {
      await this.storage.write(key, content, {
        visibility: isPublic ? Visibility.PUBLIC : Visibility.PRIVATE,
      });
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
      const stream = await this.storage.read(key);
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
      await this.storage.deleteFile(key);
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
      return await this.storage.temporaryUrl(key, options);
    } catch (err) {
      if (err instanceof UnableToGetTemporaryUrl) {
        this.logger.error(`Unable to generate temporary URL for ${key}`, err.stack);
      } else {
        this.logger.error(`Unexpected error generating temporary URL: ${key}`, err);
      }
      return null;
    }
  }
}
