import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  user_type: string;

  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  action: string;

  @Column({ type: 'jsonb', nullable: false })
  action_data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  old_data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_data: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  log_transaction_text: string;

  @Column({ type: 'text', nullable: true })
  template: string;

  @CreateDateColumn({ type: 'timestamptz', nullable: false })
  timestamp: Date;
}
