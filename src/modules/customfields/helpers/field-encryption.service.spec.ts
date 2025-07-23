import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FieldEncryptionService } from './field-encryption.service';

// Mock the EncryptionService
jest.mock('../../../common/helper/encryptionService', () => ({
	EncryptionService: {
		getInstance: jest.fn().mockReturnValue({
			encrypt: jest.fn().mockImplementation((value) => `encrypted_${value}`),
			decrypt: jest.fn().mockImplementation((value) => {
				if (value?.startsWith('encrypted_')) {
					return value.replace('encrypted_', '');
				}
				return value;
			}),
		}),
	},
}));

describe('FieldEncryptionService', () => {
	let service: FieldEncryptionService;

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
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
}); 