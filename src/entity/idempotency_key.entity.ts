import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    PrimaryColumn,
} from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKey {
    @PrimaryColumn({ type: 'varchar', length: 255 })
    idempotency_key: string;

    @Column({ type: 'varchar', length: 255 })
    api_name: string;

    @Column({ type: 'varchar', length: 50 })
    status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

    @Column({ type: 'jsonb', nullable: true })
    response_data?: any;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
    updated_at: Date;
}
