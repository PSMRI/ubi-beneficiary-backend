import { ValueTransformer } from 'typeorm';
import { EncryptionService } from './encryptionService';

// Initialize encryption service instance
const encryptionService = new EncryptionService();

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
 */
export const EncryptionTransformer: ValueTransformer = {
  /**
   * Transforms data before saving to database (encrypts the value).
   * 
   * @param value - The original value to encrypt
   * @returns Encrypted base64 string or original value if null/undefined
   */
  to: (value: any) => {
    // Skip encryption for null/undefined values
    if (value === undefined || value === null) {
      return value;
    }

    try {
      console.log('Encrypting value:', typeof value, value);
      const encrypted = encryptionService.encrypt(value);
      console.log('Encryption successful');
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  },
  /**
   * Transforms data after reading from database (decrypts the value).
   * 
   * @param value - The encrypted value from database
   * @returns Decrypted original value or original value if null/undefined
   */
  from: (value: any) => {
    // Skip decryption for null/undefined values
    if (value === undefined || value === null) {
      return value;
    }

    // Only attempt decryption on string values
    if (typeof value !== 'string') {
      return value;
    }

    try {
      console.log('Attempting to decrypt value:', value.substring(0, 50) + '...');
      const decrypted = encryptionService.decrypt(value);
      
      if (decrypted !== null) {
        console.log('Decryption successful');
        return decrypted;
      } else {
        console.warn('Decryption returned null');
        return value;
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  },
};
