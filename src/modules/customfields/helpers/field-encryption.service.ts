import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../../common/helper/encryptionService';
import { Field } from '../entities/field.entity';
import { FieldValidationService } from './field-validation.service';

/**
 * Service for handling encryption and decryption of custom field values
 * @description Provides transparent encryption/decryption for sensitive field values
 */
@Injectable()
export class FieldEncryptionService {
	private readonly logger = new Logger(FieldEncryptionService.name);
	private readonly encryptionService: EncryptionService;

	constructor(
		private readonly configService: ConfigService,
		private readonly fieldValidationService: FieldValidationService,
	) {
		this.encryptionService = EncryptionService.getInstance(configService);
	}

	/**
	 * Encrypt a field value if the field is configured for encryption
	 * @param value The value to encrypt
	 * @param field The field definition
	 * @returns Encrypted value as string, or original value if encryption is not enabled
	 */
	encryptFieldValue(value: any, field: Field): string {
		if (!field.isEncrypted()) {
			return this.fieldValidationService.serializeValue(value, field.type);
		}

		try {
			// Validate the value using centralized validation service
			this.fieldValidationService.validateFieldValue(value, field, true);
			
			// Serialize the value according to field type
			const serializedValue = this.fieldValidationService.serializeValue(value, field.type);
			
			// Encrypt the serialized value
			const encryptedValue = this.encryptionService.encrypt(serializedValue);
			
			this.logger.debug(`Encrypted value for field ${field.name} (${field.fieldId})`);
			return encryptedValue;
		} catch (error) {
			this.logger.error(`Failed to encrypt value for field ${field.name}: ${error.message}`);
			throw new BadRequestException(`Failed to encrypt field value: ${error.message}`);
		}
	}

	/**
	 * Decrypt a field value if the field is configured for encryption
	 * @param encryptedValue The encrypted value from database
	 * @param field The field definition
	 * @returns Decrypted and parsed value, or original value if encryption is not enabled
	 */
	decryptFieldValue(encryptedValue: string, field: Field): any {
		if (!field.isEncrypted()) {
			return this.fieldValidationService.deserializeValue(encryptedValue, field.type);
		}

		if (!encryptedValue) {
			return null;
		}

		try {
			// Decrypt the value
			const decryptedValue = this.encryptionService.decrypt(encryptedValue);
			
			// Deserialize according to field type
			const parsedValue = this.fieldValidationService.deserializeValue(decryptedValue, field.type);
			
			this.logger.debug(`Decrypted value for field ${field.name} (${field.fieldId})`);
			return parsedValue;
		} catch (error) {
			this.logger.error(`Failed to decrypt value for field ${field.name}: ${error.message}`);
			throw new BadRequestException(`Failed to decrypt field value: ${error.message}`);
		}
	}

	/**
	 * Check if a field can have encryption enabled
	 * @param field The field to check
	 * @param hasExistingValues Whether the field has existing values
	 * @returns true if encryption can be enabled
	 */
	canEnableEncryption(field: Field, hasExistingValues: boolean): boolean {
		if (field.isEncrypted()) {
			return false; // Already encrypted
		}

		if (hasExistingValues) {
			return false; // Cannot enable encryption for fields with existing values
		}

		return true;
	}

	/**
	 * Check if a field can have encryption disabled
	 * @param field The field to check
	 * @returns true if encryption can be disabled
	 */
	canDisableEncryption(field: Field): boolean {
		// Encryption cannot be disabled once enabled (for security reasons)
		return !field.isEncrypted();
	}
}