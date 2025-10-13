import { ConfigService } from '@nestjs/config';
import { EncryptionTransformer } from 'src/common/helper/encryptionTransformer';
import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';

const configService = new ConfigService();
const encryptionTransformer = new EncryptionTransformer(configService);

@Entity('user_applications')
export class UserApplication {
	@Column('uuid')
	user_id: string;

	@Column({ type: 'varchar', length: 255 })
	benefit_id: string;

	@PrimaryGeneratedColumn('uuid')
	internal_application_id: string;

	@Column({ type: 'varchar', length: 255 })
	benefit_provider_id: string;

	@Column({ type: 'varchar', length: 255 })
	benefit_provider_uri: string;

	@Column({ type: 'varchar', length: 100, nullable: true })
	bpp_application_id: string;

	@Column({ type: 'varchar', length: 100, nullable: true })
	order_id: string;

	@Column({ type: 'varchar', length: 100, nullable: true })
	transaction_id: string;

	@Column({ type: 'text', nullable: true })
	application_name: string;

	@Column({ type: 'varchar', length: 20 })
	status: string;

	@Column({ type: 'text', nullable: true })
	remark: string;

	@Column({ type: 'text', transformer: encryptionTransformer })
	application_data: any; // Can be object, array, or null after decryption

	@CreateDateColumn({ type: 'timestamptz' })
	created_at: Date;

	@UpdateDateColumn({ type: 'timestamptz', nullable: true })
	updated_at: Date;
}
