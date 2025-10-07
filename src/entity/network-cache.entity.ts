import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('ubi_network_cache')
  export class NetworkCache {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    unique_id: string;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    item_id: string;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_id: string;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    provider_name: string;
  
    @Column({ type: 'varchar', length: 500, nullable: true })
    title: string;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @Column({ type: 'varchar', length: 500, nullable: true })
    url: string;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    bpp_id: string;
  
    @Column({ type: 'varchar', length: 500, nullable: true })
    bpp_uri: string;
  
    @Column({ type: 'timestamptz', nullable: true })
    enrollmentEndDate: Date;
  
    @Column({ type: 'jsonb', nullable: true })
    offeringInstitute: any;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    credits: string;
  
    @Column({ type: 'text', nullable: true })
    instructors: string;
  
    @Column({ type: 'json', nullable: true })
    item: any;
  
    @Column({ type: 'json', nullable: true })
    descriptor: any;
  
    @Column({ type: 'json', nullable: true })
    categories: any;
  
    @Column({ type: 'json', nullable: true })
    fulfillments: any;
  
    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
  
    @UpdateDateColumn({ type: 'timestamptz', nullable: true })
    updated_at: Date;
  }