import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldsController } from './customfields.controller';
import { CustomFieldsService } from './customfields.service';
import { Field } from './entities/field.entity';
import { FieldValue } from './entities/field-value.entity';
import { AdminModule } from '../admin/admin.module';
import { FieldEncryptionService } from './helpers/field-encryption.service';
import { FieldValidationService } from './helpers/field-validation.service';

/**
 * CustomFields Module
 * @description Provides functionality for managing custom fields and their values
 * for any entity in the system. Supports dynamic field creation, validation,
 * and value management without altering core entity schemas.
 * @features
 * - Dynamic field definition management
 * - Field value storage and retrieval
 * - Multi-entity support (User, Cohort, etc.)
 * - Field type validation and transformation
 * - Advanced search and filtering capabilities
 * - Optional encryption support for sensitive fields
 * @author Development Team
 * @since 1.0.0
 */
@Module({
	imports: [TypeOrmModule.forFeature([Field, FieldValue]), AdminModule],
	controllers: [CustomFieldsController],
	providers: [CustomFieldsService, FieldEncryptionService, FieldValidationService],
	exports: [CustomFieldsService, FieldEncryptionService, FieldValidationService, TypeOrmModule],
})
export class CustomFieldsModule {}
