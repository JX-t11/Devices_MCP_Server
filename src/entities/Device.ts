/**
 * 设备实体
 */

import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('device')
@Index(['product_key', 'product_version'])
@Index(['device_key'])
export class Device {

  @PrimaryGeneratedColumn()
  device_id!: number;

  @Column({ length: 64, default: '' })
  device_key!: string;

  @Column({ length: 20, default: '' })
  mac!: string;

  @Column({ length: 50, default: '' })
  name!: string;

  @Column({ length: 50, default: '' })
  product_key!: string;

  @Column({ length: 20, default: '' })
  product_version!: string;

  @Column({ default: 0 })
  is_disable!: number
  
  @Column({ default: 0 })
  is_delete!: number

  @Column({ unsigned: true, default: 0 })
  create_time!: number;

  @Column({ unsigned: true, default: 0 })
  update_time!: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
