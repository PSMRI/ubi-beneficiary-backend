import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Field } from './field.entity';

@Entity('fieldValues')
@Index(['fieldId', 'itemId'])
@Index(['itemId'])
export class FieldValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  fieldId: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Field, field => field.fieldValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldId' })
  field: Field;
} 