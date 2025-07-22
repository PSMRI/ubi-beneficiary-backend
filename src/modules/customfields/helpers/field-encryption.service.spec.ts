import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FieldEncryptionService } from './field-encryption.service';
import { Field, FieldType } from '../entities/field.entity';

// Mock the EncryptionService
jest.mock('../../../common/helper/encryptionService', () => ({
	EncryptionService: {
		getInstance: jest.fn().mockReturnValue({
			encrypt: jest.fn().mockImplementation((value) => `encrypted_${value}`),
			decrypt: jest.fn().mockImplementation((value) => {
				if (value && value.startsWith('encrypted_')) {
					return value.replace('encrypted_', '');
				}
				return value;
			}),
		}),
	},
}));

describe('FieldEncryptionService', () => {
	let service: FieldEncryptionService;
	let configService: ConfigService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				FieldEncryptionService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn().mockReturnValue('mock-key'),
					},
				},
			],
		}).compile();

		service = module.get<FieldEncryptionService>(FieldEncryptionService);
		configService = module.get<ConfigService>(ConfigService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('encryptFieldValue', () => {
		it('should encrypt text field value when field is encrypted', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.TEXT;
			field.fieldAttributes = { isEncrypted: true };

			const value = 'sensitive data';
			const encryptedValue = service.encryptFieldValue(value, field);

			expect(encryptedValue).toBeDefined();
			expect(encryptedValue).toBe('encrypted_sensitive data');
			expect(typeof encryptedValue).toBe('string');
		});

		it('should not encrypt text field value when field is not encrypted', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.TEXT;
			field.fieldAttributes = { isEncrypted: false };

			const value = 'normal data';
			const result = service.encryptFieldValue(value, field);

			expect(result).toBe(value);
		});

		it('should encrypt numeric field value', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.NUMERIC;
			field.fieldAttributes = { isEncrypted: true };

			const value = 123.45;
			const encryptedValue = service.encryptFieldValue(value, field);

			expect(encryptedValue).toBeDefined();
			expect(encryptedValue).toBe('encrypted_123.45');
		});

		it('should encrypt boolean field value', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.CHECKBOX;
			field.fieldAttributes = { isEncrypted: true };

			const value = true;
			const encryptedValue = service.encryptFieldValue(value, field);

			expect(encryptedValue).toBeDefined();
			expect(encryptedValue).toBe('encrypted_true');
		});
	});

	describe('decryptFieldValue', () => {
		it('should decrypt encrypted text field value', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.TEXT;
			field.fieldAttributes = { isEncrypted: true };

			const originalValue = 'sensitive data';
			const encryptedValue = service.encryptFieldValue(originalValue, field);
			const decryptedValue = service.decryptFieldValue(encryptedValue, field);

			expect(decryptedValue).toBe(originalValue);
		});

		it('should decrypt encrypted numeric field value', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.NUMERIC;
			field.fieldAttributes = { isEncrypted: true };

			const originalValue = 123.45;
			const encryptedValue = service.encryptFieldValue(originalValue, field);
			const decryptedValue = service.decryptFieldValue(encryptedValue, field);

			expect(decryptedValue).toBe(originalValue);
		});

		it('should return null for null encrypted value', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.TEXT;
			field.fieldAttributes = { isEncrypted: true };

			const decryptedValue = service.decryptFieldValue(null, field);

			expect(decryptedValue).toBeNull();
		});

		it('should not decrypt when field is not encrypted', () => {
			const field = new Field();
			field.name = 'testField';
			field.type = FieldType.TEXT;
			field.fieldAttributes = { isEncrypted: false };

			const value = 'normal data';
			const result = service.decryptFieldValue(value, field);

			expect(result).toBe(value);
		});
	});

	describe('canEnableEncryption', () => {
		it('should return false if field is already encrypted', () => {
			const field = new Field();
			field.fieldAttributes = { isEncrypted: true };

			const result = service.canEnableEncryption(field, false);

			expect(result).toBe(false);
		});

		it('should return false if field has existing values', () => {
			const field = new Field();
			field.fieldAttributes = { isEncrypted: false };

			const result = service.canEnableEncryption(field, true);

			expect(result).toBe(false);
		});

		it('should return true if field can have encryption enabled', () => {
			const field = new Field();
			field.fieldAttributes = { isEncrypted: false };

			const result = service.canEnableEncryption(field, false);

			expect(result).toBe(true);
		});
	});

	describe('canDisableEncryption', () => {
		it('should return false if field is encrypted', () => {
			const field = new Field();
			field.fieldAttributes = { isEncrypted: true };

			const result = service.canDisableEncryption(field);

			expect(result).toBe(false);
		});

		it('should return true if field is not encrypted', () => {
			const field = new Field();
			field.fieldAttributes = { isEncrypted: false };

			const result = service.canDisableEncryption(field);

			expect(result).toBe(true);
		});
	});
}); 