/**
 * 设备间相互授实体类
 * 记录一个设备对另一个设备的授权关系
 */

import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('device_authorization')
@Index(['authorizing_device_key', 'authorized_device_key'], { unique: true })
@Index(['authorized_device_key'])
@Index(['status'])
@Index(['start_time', 'end_time'])
export class DeviceAuthorization {

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64, default: '' })
  authorizing_device_key!: string;

  @Column({ length: 64, default: '' })
  authorized_device_key!: string;

  @Column({ type: 'tinyint', default: 1 })
  authorization_type!: number;

  @Column({ type: 'text', default: '' })
  access_permissions!: string
  
  @Column({ type: 'tinyint', default: 1 })
  status!: number

  @Column({ unsigned: true, default: 0 })
  start_time!: number;

  @Column({ unsigned: true, default: 0 })
  end_time!: number;

  @Column({ unsigned: true, default: 0 })
  create_time!: number;

  @Column({ unsigned: true, default: 0 })
  update_time!: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;

  @Column({ length: 255, default: '' })
  remarks!: string
}
