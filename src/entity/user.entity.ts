import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  PrimaryColumn,
} from 'typeorm';

@Entity('users')
@Unique(['user_id', 'email'])
export class User {

  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  user_id: string;

  @Column({ length: 50, nullable: true })
  firstName: string;

  @Column({ length: 50, nullable: true })
  middleName: string;

  @Column({ length: 50, nullable: true })
  lastName: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 100, nullable: true })
  phoneNumber: string;

  @Column({ type: 'date', nullable: true })
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

  @Column({ name: 'walletToken', type: 'text', nullable: true })
  walletToken: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;
}
