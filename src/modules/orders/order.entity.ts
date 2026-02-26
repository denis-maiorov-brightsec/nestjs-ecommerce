import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { OrderStatus } from './order-status';

@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 128 })
  customerId!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  items!: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'double precision' })
  totalAmount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
