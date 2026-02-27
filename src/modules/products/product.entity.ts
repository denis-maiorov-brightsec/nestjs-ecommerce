import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity({ name: 'products' })
export class ProductEntity {
  @ApiProperty({
    example: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Laptop' })
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @ApiProperty({ example: 'LP-001' })
  @Column({ name: 'sku', type: 'varchar', length: 128 })
  stockKeepingUnit!: string;

  @ApiProperty({ example: 1299.99 })
  @Column({ type: 'double precision' })
  price!: number;

  @ApiProperty({ example: 'active' })
  @Column({ type: 'varchar', length: 64 })
  status!: string;

  @ApiPropertyOptional({ example: 'c-electronics', nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  categoryId?: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z', format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z', format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
