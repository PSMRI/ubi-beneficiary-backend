import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'response_cache' })
export class ResponseCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  action: string;

  @Column({ type: 'text', nullable: true })
  transaction_id: string;

  @Column({ type: 'json', nullable: true })
  response: any;
}