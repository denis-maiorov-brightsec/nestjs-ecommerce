import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { OrderStatus } from './order-status';
import { ORDER_STATUSES } from './order-status';

@Entity({ name: 'orders' })
export class OrderEntity {
  @ApiProperty({
    example: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ enum: ORDER_STATUSES, example: 'pending' })
  @Column({ type: 'varchar', length: 32 })
  status!: OrderStatus;

  @ApiProperty({ example: 'customer-001' })
  @Column({ type: 'varchar', length: 128 })
  customerId!: string;

  @ApiProperty({
    type: [Object],
    example: [{ productId: 'product-001', quantity: 1, unitPrice: 49.99 }],
  })
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  items!: Record<string, unknown>[];

  @ApiProperty({ example: 'USD', minLength: 3, maxLength: 3 })
  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @ApiProperty({ example: 49.99 })
  @Column({ type: 'double precision' })
  totalAmount!: number;

  @ApiProperty({
    example: '2026-01-16T08:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty({
    example: 'Customer requested cancellation before shipment',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 512, nullable: true })
  cancellationReason!: string | null;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z', format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z', format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
