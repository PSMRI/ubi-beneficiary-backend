import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../../common/helper/encryptionService';
import { Field, FieldType } from '../entities/field.entity';
import { FieldValue } from '../entities/field-value.entity';

/**
 * Service for handling encryption and decryption of custom field values
 * @description Provides transparent encryption/decryption for sensitive field values
 */
@Injectable()
export class FieldEncryptionService {
	private readonly logger = new Logger(FieldEncryptionService.name);
	private readonly encryptionService: EncryptionService;

	constructor(private readonly configService: ConfigService) {
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
			return this.serializeValue(value, field.type);
		}

		try {
			// Validate the value before encryption
			this.validateValueForType(value, field.type);
			
			// Serialize the value according to field type
			const serializedValue = this.serializeValue(value, field.type);
			
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
			return this.deserializeValue(encryptedValue, field.type);
		}

		if (!encryptedValue) {
			return null;
		}

		try {
			// Decrypt the value
			const decryptedValue = this.encryptionService.decrypt(encryptedValue);
			
			// Deserialize according to field type
			const parsedValue = this.deserializeValue(decryptedValue, field.type);
			
			this.logger.debug(`Decrypted value for field ${field.name} (${field.fieldId})`);
			return parsedValue;
		} catch (error) {
			this.logger.error(`Failed to decrypt value for field ${field.name}: ${error.message}`);
			throw new BadRequestException(`Failed to decrypt field value: ${error.message}`);
		}
	}

	/**
	 * Serialize a value according to field type for storage
	 * @param value The value to serialize
	 * @param fieldType The field type
	 * @returns Serialized value as string
	 */
	private serializeValue(value: any, fieldType: FieldType): string {
		if (value === null || value === undefined) {
			return null;
		}

		switch (fieldType) {
			case FieldType.MULTI_SELECT:
			case FieldType.JSON:
				return typeof value === 'string' ? value : JSON.stringify(value);

			case FieldType.CHECKBOX:
				return Boolean(value).toString();

			case FieldType.DATE:
				if (value instanceof Date) {
					return value.toISOString().split('T')[0];
				}
				return String(value);

			case FieldType.DATETIME:
				if (value instanceof Date) {
					return value.toISOString();
				}
				return String(value);

			case FieldType.NUMERIC:
			case FieldType.CURRENCY:
			case FieldType.PERCENT:
			case FieldType.RATING:
				return String(value);

			default:
				return String(value);
		}
	}

	/**
	 * Deserialize a value according to field type
	 * @param serializedValue The serialized value from storage
	 * @param fieldType The field type
	 * @returns Deserialized value
	 */
	private deserializeValue(serializedValue: string, fieldType: FieldType): any {
		if (!serializedValue) {
			return null;
		}

		switch (fieldType) {
			case FieldType.NUMERIC:
			case FieldType.CURRENCY:
			case FieldType.PERCENT:
			case FieldType.RATING:
				return parseFloat(serializedValue);

			case FieldType.DATE:
			case FieldType.DATETIME:
				return new Date(serializedValue);

			case FieldType.CHECKBOX:
				return serializedValue === 'true';

			case FieldType.MULTI_SELECT:
			case FieldType.JSON:
				try {
					return JSON.parse(serializedValue);
				} catch {
					return serializedValue;
				}

			default:
				return serializedValue;
		}
	}

	/**
	 * Validate a value against the field type
	 * @param value The value to validate
	 * @param fieldType The field type
	 */
	private validateValueForType(value: any, fieldType: FieldType): void {
		if (value === null || value === undefined) {
			return; // Null values are always valid
		}

		switch (fieldType) {
			case FieldType.NUMERIC:
			case FieldType.CURRENCY:
			case FieldType.PERCENT:
			case FieldType.RATING:
				if (isNaN(Number(value))) {
					throw new BadRequestException(`Value must be a valid number for field type ${fieldType}`);
				}
				break;

			case FieldType.DATE:
			case FieldType.DATETIME:
				const date = new Date(value);
				if (isNaN(date.getTime())) {
					throw new BadRequestException(`Value must be a valid date for field type ${fieldType}`);
				}
				break;

			case FieldType.CHECKBOX:
				if (typeof value !== 'boolean' && !['true', 'false', '0', '1'].includes(String(value).toLowerCase())) {
					throw new BadRequestException(`Value must be a valid boolean for field type ${fieldType}`);
				}
				break;

			case FieldType.MULTI_SELECT:
			case FieldType.JSON:
				// For JSON fields, we'll let JSON.stringify handle validation
				try {
					JSON.stringify(value);
				} catch (error) {
					throw new BadRequestException(`Value must be valid JSON for field type ${fieldType}`);
				}
				break;

			default:
				// For text-based fields, any value is valid
				break;
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