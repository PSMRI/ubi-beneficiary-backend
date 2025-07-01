import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { EncryptionTransformer } from '../common/helper/encryptionTransformer';

@Entity('users')
@Unique(['user_id', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ length: 50 })
  firstName: string;

  @Column({ length: 50, nullable: true })
  middleName: string;

  @Column({ length: 50 })
  lastName: string;

  @Column({ length: 100, unique: true, transformer: EncryptionTransformer })
  email: string;

  @Column({ length: 100, nullable: true, transformer: EncryptionTransformer })
  phoneNumber: string;

  @Column({ type: 'date', nullable: true, transformer: EncryptionTransformer })
  dob: Date;

  @Column({ length: 255 })
  sso_provider: string;

  @Column({ length: 255 })
  sso_id: string;

  @Column({ length: 255, nullable: true })
  image: string;

  @Column({ type: 'boolean' })
  fieldsVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  fieldsVerifiedAt: Date;

  @Column({ type: 'json' })
  fieldsVerificationData: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;
}
