import { ValueTransformer } from 'typeorm';
import { EncryptionService } from './encryptionService';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

/**
 * TypeORM ValueTransformer for automatic encryption/decryption of database fields.
 * 
 * Usage: Add @Column({ transformer: EncryptionTransformer }) to entity properties
 * that need to be encrypted in the database.
 * 
 * Features:
 * - Automatically encrypts data before saving to database
 * - Automatically decrypts data when reading from database
 * - Uses AES-256-GCM encryption for secure data storage
 * - Proper NestJS dependency injection support
 * - Class-based implementation for better TypeScript support
 */
@Injectable()
export class EncryptionTransformer implements ValueTransformer {
  private readonly logger = new Logger(EncryptionTransformer.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Transforms data before saving to database (encrypts the value).
   * 
   * @param value - The original value to encrypt
   * @returns Encrypted base64 string or original value if null/undefined
   */
  to(value: any): any {
    // Skip encryption for null/undefined values
    if (value === undefined || value === null) {
      return value;
    }

    try {
      const encryptionService = EncryptionService.getInstance(this.configService);
      const encrypted = encryptionService.encrypt(value);
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Transforms data after reading from database (decrypts the value).
   * 
   * @param value - The encrypted value from database
   * @returns Decrypted original value or original value if null/undefined
   */
  from(value: any): any {
    // Skip decryption for null/undefined values
    if (value === undefined || value === null) {
      return value;
    }

    // Only attempt decryption on string values
    if (typeof value !== 'string') {
      return value;
    }

    try {
      const encryptionService = EncryptionService.getInstance(this.configService);
      const decrypted = encryptionService.decrypt(value);

      if (decrypted !== null) {
        return decrypted;
      } else {
        throw new Error('Decryption returned null: Possible data corruption or misconfiguration');
      }
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw error;
    }
  }
}