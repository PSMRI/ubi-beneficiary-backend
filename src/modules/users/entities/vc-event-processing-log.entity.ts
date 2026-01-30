import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('vc_event_processing_log')
export class VcEventProcessingLog {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 255 })
	vc_public_id: string;

	@Column({ type: 'varchar', length: 50, nullable: true })
	type: string | null;

	@Column({ type: 'varchar', length: 20 })
	status_processed: 'success' | 'failed';

	@Column({ type: 'text', nullable: true })
	error_message: string | null;

	@Column({ type: 'timestamptz' })
	processed_at: Date;

	@Column({ type: 'timestamptz' })
	batch_from: Date;

	@Column({ type: 'timestamptz' })
	batch_to: Date;

	@CreateDateColumn({ type: 'timestamptz' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamptz' })
	updated_at: Date;
}



