import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { FieldValue } from './field-value.entity';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMERIC = 'numeric',
  DATE = 'date',
  DATETIME = 'datetime',
  DROP_DOWN = 'drop_down',
  MULTI_SELECT = 'multi_select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  FILE = 'file',
  JSON = 'json',
  CURRENCY = 'currency',
  PERCENT = 'percent',
  RATING = 'rating',
}

export enum FieldContext {
  USERS = 'USERS',
  COHORTS = 'COHORTS',
  ORGANIZATIONS = 'ORGANIZATIONS',
}

@Entity('fields')
@Index(['context', 'contextType'])
@Index(['isRequired', 'isHidden'])
export class Field {
  @PrimaryGeneratedColumn('uuid')
  fieldId: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ length: 255 })
  label: string;

  @Column({
    type: 'enum',
    enum: FieldType,
    default: FieldType.TEXT,
  })
  type: FieldType;

  @Column({
    type: 'enum',
    enum: FieldContext,
    default: FieldContext.USERS,
  })
  context: FieldContext;

  @Column({ length: 100, nullable: true })
  contextType: string;

  @Column({ type: 'jsonb', nullable: true })
  fieldParams: any;

  @Column({ type: 'jsonb', nullable: true })
  fieldAttributes: any;

  @Column({ type: 'jsonb', nullable: true })
  sourceDetails: any;

  @Column({ type: 'jsonb', nullable: true })
  dependsOn: any;

  @Column({ type: 'int', default: 0 })
  ordering: number;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;


  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => FieldValue, fieldValue => fieldValue.field)
  fieldValues: FieldValue[];
} 