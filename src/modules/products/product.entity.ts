import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'sku', type: 'varchar', length: 128 })
  stockKeepingUnit!: string;

  @Column({ type: 'double precision' })
  price!: number;

  @Column({ type: 'varchar', length: 64 })
  status!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  categoryId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
