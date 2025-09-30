/**
 * 产品实体
 */

import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('product')
@Index(['product_key', 'product_version'])
export class Product {

  @PrimaryGeneratedColumn()
  product_id!: number;

  @Column({ type: 'varchar', length: 50, default: '' })
  product_key!: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  product_name!: string;

  @Column({ type: 'varchar', length: 20, default: '' })
  product_version!: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  mcp_name!: string;

  @Column({ type: 'longtext' })
  mcp_tools!: string;
  
  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  is_delete!: number;

  @Column({ unsigned: true, default: 0 })
  create_time!: number;

  @Column({ unsigned: true, default: 0 })
  update_time!: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
