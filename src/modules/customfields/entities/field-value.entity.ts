import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Field } from './field.entity';

/**
 * FieldValue entity representing custom field values
 * @entity fieldValues
 * @description Stores the value of each custom field for a specific entity instance.
 * The itemId is a generic reference that can point to a User, Cohort, etc.
 */
@Entity('fieldValues')
@Index(['fieldId', 'itemId'])
@Index(['itemId'])
@Index(['fieldId'])
export class FieldValue {
	/**
	 * Unique identifier for the field value
	 * @description UUID v4 generated automatically on creation
	 */
	@ApiProperty({
		description: 'Unique identifier for the field value',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	@PrimaryGeneratedColumn('uuid')
		id: string;

	/**
	 * Reference to the field definition
	 * @description Foreign key to the Field entity
	 */
	@ApiProperty({
		description: 'Reference to the field definition',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	@Column({ type: 'uuid' })
	@Index()
		fieldId: string;

	/**
	 * Generic entity instance ID
	 * @description ID of the entity instance (e.g., userId, cohortId, etc.)
	 * This allows the same field to be used across different entity types
	 */
	@ApiProperty({
		description: 'Generic entity instance ID',
		example: '550e8400-e29b-41d4-a716-446655440000',
		format: 'uuid',
	})
	@Column({ type: 'uuid' })
	@Index()
		itemId: string;

	/**
	 * The field value
	 * @description The actual value stored for this field instance
	 * Type depends on the field type - stored as text but can be JSON for complex types
	 */
	@ApiProperty({
		description: 'The field value',
		example: 'Some text value',
	})
	@Column({ type: 'text', nullable: true })
		value: string;

	/**
	 * Additional metadata for the field value
	 * @description JSON object containing value-specific metadata
	 */
	@ApiProperty({
		description: 'Additional metadata for the field value',
		example: {
			originalFilename: 'document.pdf',
			fileSize: 1024,
			mimeType: 'application/pdf',
		},
		required: false,
	})
	@Column({ type: 'jsonb', nullable: true })
		metadata?: Record<string, any>;

	/**
	 * Field value creation timestamp
	 * @description Automatically set when the field value is created
	 */
	@ApiProperty({
		description: 'Field value creation timestamp',
		example: '2023-01-01T00:00:00.000Z',
		format: 'date-time',
	})
	@CreateDateColumn()
		createdAt: Date;

	/**
	 * Field value last update timestamp
	 * @description Automatically updated when the field value is modified
	 */
	@ApiProperty({
		description: 'Field value last update timestamp',
		example: '2023-01-01T00:00:00.000Z',
		format: 'date-time',
	})
	@UpdateDateColumn()
		updatedAt: Date;

	/**
	 * Field definition this value belongs to
	 * @description Many-to-one relationship with Field entity
	 */
	@ManyToOne(() => Field, (field) => field.fieldValues, {
		onDelete: 'CASCADE',
		eager: false,
	})
	@JoinColumn({ name: 'fieldId' })
		field: Field;

	/**
	 * Get parsed value based on field type
	 * @returns Parsed value according to field type
	 */
	getParsedValue(): any {
		if (!this.value) {
			return null;
		}

		if (!this.field) {
			return this.value;
		}

		switch (this.field.type) {
			case 'numeric':
			case 'currency':
			case 'percent':
			case 'rating':
				return parseFloat(this.value);

			case 'date':
			case 'datetime':
				return new Date(this.value);

			case 'checkbox':
				return this.value === 'true';

			case 'multi_select':
			case 'json':
				try {
					return JSON.parse(this.value);
				} catch {
					return this.value;
				}

			default:
				return this.value;
		}
	}

	/**
	 * Set value with automatic type conversion
	 * @param value Value to set
	 */
	setValue(value: any): void {
		if (value === null || value === undefined) {
			this.value = null;
			return;
		}

		if (!this.field) {
			this.value = String(value);
			return;
		}

		switch (this.field.type) {
			case 'multi_select':
			case 'json':
				this.value =
					typeof value === 'string' ? value : JSON.stringify(value);
				break;

			case 'checkbox':
				this.value = Boolean(value).toString();
				break;

			case 'date':
				if (value instanceof Date) {
					this.value = value.toISOString().split('T')[0];
				} else {
					this.value = String(value);
				}
				break;

			case 'datetime':
				if (value instanceof Date) {
					this.value = value.toISOString();
				} else {
					this.value = String(value);
				}
				break;

			default:
				this.value = String(value);
		}
	}

	/**
	 * Check if value is empty
	 * @returns true if value is empty or null
	 */
	isEmpty(): boolean {
		return !this.value || this.value.trim() === '';
	}

	/**
	 * Validate value against field constraints
	 * @returns true if value is valid
	 */
	isValid(): boolean {
		if (!this.field) {
			return true;
		}

		// Check required field
		if (this.field.isRequired && this.isEmpty()) {
			return false;
		}

		// Check field-specific validation
		const fieldParams = this.field.fieldParams;
		if (fieldParams?.validation) {
			const validation = fieldParams.validation;

			// Check regex pattern
			if (validation.regex && this.value) {
				const regex = new RegExp(validation.regex);
				if (!regex.test(this.value)) {
					return false;
				}
			}

			// Check min/max length
			if (
				validation.minLength &&
				this.value &&
				this.value.length < validation.minLength
			) {
				return false;
			}
			if (
				validation.maxLength &&
				this.value &&
				this.value.length > validation.maxLength
			) {
				return false;
			}

			// Check min/max value for numeric fields
			if (
				this.field.type === 'numeric' ||
				this.field.type === 'currency' ||
				this.field.type === 'percent'
			) {
				const numValue = parseFloat(this.value);
				if (validation.min !== undefined && numValue < validation.min) {
					return false;
				}
				if (validation.max !== undefined && numValue > validation.max) {
					return false;
				}
			}
		}

		// Check dropdown/radio options
		if (
			(this.field.type === 'drop_down' || this.field.type === 'radio') &&
			fieldParams?.options
		) {
			const validOptions = fieldParams.options.map((opt) => opt.value);
			if (!validOptions.includes(this.value)) {
				return false;
			}
		}

		return true;
	}
}
