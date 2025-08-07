#!/usr/bin/env node

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

// Try to load environment variables from .env file if available
try {
	const dotenv = require('dotenv');
	dotenv.config();
} catch (error) {
	// dotenv not available, continue with existing environment variables
}

// Import entities and services
import { Field } from '../src/modules/customfields/entities/field.entity';
import { FieldValue } from '../src/modules/customfields/entities/field-value.entity';
import { EncryptionService } from '../src/common/helper/encryptionService';

/**
 * Simple Field Data Encryption Migration Script
 * One-time migration to encrypt sensitive field data
 */
class SimpleFieldEncryptionMigration {
	private dataSource: DataSource;
	private encryptionService: EncryptionService;
	private isDryRun: boolean;
	
	// List of sensitive fields to encrypt
	private readonly sensitiveFields = [
		'aadhaar',
		'bankAccountNumber',
		'udid'
	];

	constructor(isDryRun: boolean = false) {
		this.isDryRun = isDryRun;
	}

	/**
	 * Initialize database connection and encryption service
	 */
	async initialize(): Promise<void> {
		this.log('🚀 Starting Field Encryption Migration...');
		
		// Validate required environment variables
		const requiredEnvVars = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME', 'ENCRYPTION_KEY'];
		const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
		
		if (missingVars.length > 0) {
			throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
		}
		
		// Initialize DataSource
		this.dataSource = new DataSource({
			type: 'postgres',
			host: process.env.DB_HOST!,
			port: parseInt(process.env.DB_PORT || '5432'),
			username: process.env.DB_USERNAME!,
			password: String(process.env.DB_PASSWORD),
			database: process.env.DB_NAME!,
			entities: [Field, FieldValue],
			synchronize: false,
			logging: false
		});

		await this.dataSource.initialize();
		this.log('✅ Database connected');

		// Initialize encryption service
		const configService = new ConfigService();
		this.encryptionService = new EncryptionService(configService);
		this.log('✅ Encryption service ready');
	}

	/**
	 * Get fields that need encryption
	 */
	async getFieldsToEncrypt(): Promise<Field[]> {
		const fieldRepository = this.dataSource.getRepository(Field);
		
		const fields = await fieldRepository
			.createQueryBuilder('field')
			.where('field.name IN (:...names)', { names: this.sensitiveFields })
			.andWhere(
				'(field."fieldAttributes" IS NULL OR field."fieldAttributes"->>\'isEncrypted\' IS NULL OR field."fieldAttributes"->>\'isEncrypted\' != \'true\')'
			)
			.getMany();

		return fields;
	}

	/**
	 * Check if a value is already encrypted
	 */
	isValueEncrypted(value: string): boolean {
		try {
			const decrypted = this.encryptionService.decrypt(value);
			return decrypted !== null;
		} catch {
			return false;
		}
	}

	/**
	 * Update field attributes to mark as encrypted
	 */
	async updateFieldAttributes(fields: Field[]): Promise<void> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			for (const field of fields) {
				const currentAttributes = field.fieldAttributes || {};
				const updatedAttributes = {
					...currentAttributes,
					isEncrypted: true
				};

				if (!this.isDryRun) {
					await queryRunner.query(
						`UPDATE fields SET "fieldAttributes" = $1 WHERE "fieldId" = $2`,
						[JSON.stringify(updatedAttributes), field.fieldId]
					);
				}
				
				this.log(`  ✓ ${field.name}: fieldAttributes updated`);
			}

			if (!this.isDryRun) {
				await queryRunner.commitTransaction();
			} else {
				await queryRunner.rollbackTransaction();
			}
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Encrypt field values
	 */
	async encryptFieldValues(fields: Field[]): Promise<number> {
		const fieldIds = fields.map(f => f.fieldId);
		let encryptedCount = 0;

		// Get all field values that need encryption
		const fieldValues = await this.dataSource
			.getRepository(FieldValue)
			.createQueryBuilder('fieldValue')
			.where('fieldValue.fieldId IN (:...fieldIds)', { fieldIds })
			.andWhere('fieldValue.value IS NOT NULL')
			.andWhere('fieldValue.value != \'\'')
			.getMany();

		if (fieldValues.length === 0) {
			this.log('  ℹ️ No field values found to encrypt');
			return 0;
		}

		this.log(`📊 Processing ${fieldValues.length} field values...`);

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			for (const fieldValue of fieldValues) {
				// Skip if already encrypted
				if (this.isValueEncrypted(fieldValue.value)) {
					continue;
				}

				if (!this.isDryRun) {
					// Encrypt the value
					const encryptedValue = this.encryptionService.encrypt(fieldValue.value);
					
					// Update the database
					await queryRunner.manager.update(FieldValue,
						{ id: fieldValue.id },
						{ value: encryptedValue }
					);
				}

				encryptedCount++;
			}

			if (!this.isDryRun) {
				await queryRunner.commitTransaction();
			} else {
				await queryRunner.rollbackTransaction();
			}

			return encryptedCount;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Run the migration
	 */
	async run(): Promise<void> {
		try {
			await this.initialize();

			// Get fields to encrypt
			const fields = await this.getFieldsToEncrypt();
			
			if (fields.length === 0) {
				this.log('✅ All sensitive fields are already encrypted');
				return;
			}

			this.log(`🎯 Found ${fields.length} fields to encrypt: ${fields.map(f => f.name).join(', ')}`);

			if (this.isDryRun) {
				this.log('🏃 DRY RUN MODE - No changes will be made');
			}

			// Update field attributes
			this.log('🔧 Updating field attributes...');
			await this.updateFieldAttributes(fields);

			// Encrypt field values
			this.log('🔐 Encrypting field values...');
			const encryptedCount = await this.encryptFieldValues(fields);

			// Summary
			this.log('\n📋 MIGRATION SUMMARY');
			this.log('====================');
			this.log(`Mode: ${this.isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
			this.log(`Fields updated: ${fields.length}`);
			this.log(`Values encrypted: ${encryptedCount}`);

			if (this.isDryRun) {
				this.log('\n🏃 This was a dry run. Run without --dry-run to execute.');
			} else {
				this.log('\n✅ Migration completed successfully!');
			}

		} catch (error) {
			this.log(`❌ Migration failed: ${error.message}`);
			throw error;
		} finally {
			if (this.dataSource && this.dataSource.isInitialized) {
				await this.dataSource.destroy();
			}
		}
	}

	/**
	 * Log messages with timestamp
	 */
	private log(message: string): void {
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] ${message}`);
	}
}

/**
 * Main execution
 */
async function main(): Promise<void> {
	try {
		// Get the npm script name that was called
		const npmScript = process.env.npm_lifecycle_event;
		
		// Check for arguments in process.argv or npm script name
		const isDryRun = process.argv.includes('--dry-run') || 
						process.argv.includes('dry-run') ||
						npmScript?.includes('dry-run');
		
		const showHelp = process.argv.includes('--help') || 
						process.argv.includes('help') ||
						npmScript?.includes('help');
		
		// Show help
		if (showHelp) {
			console.log(`
Field Data Encryption Migration Script

Usage:
  npm run script:encrypt-fields -- --dry-run    # Preview changes (RECOMMENDED FIRST)
  npm run script:encrypt-fields                 # Run live migration  
  npm run script:encrypt-fields -- --help       # Show this help

Direct execution:
  npx ts-node -r tsconfig-paths/register scripts/encrypt-fields-migration.ts --dry-run
  npx ts-node -r tsconfig-paths/register scripts/encrypt-fields-migration.ts --help
  npx ts-node -r tsconfig-paths/register scripts/encrypt-fields-migration.ts

Fields to be encrypted: aadhaar, bankAccountNumber, bankIfscCode, annualIncome, udid
			`);
			process.exit(0);
		}

		const migration = new SimpleFieldEncryptionMigration(isDryRun);
		await migration.run();
		process.exit(0);
	} catch (error) {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	}
}

// Execute if this file is run directly
if (require.main === module) {
	main();
} 