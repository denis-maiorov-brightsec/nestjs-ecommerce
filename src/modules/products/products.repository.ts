import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationParams } from '../../common/pagination/pagination.helper';
import { ProductEntity } from './product.entity';

interface ProductWritePayload {
  name: string;
  stockKeepingUnit: string;
  price: number;
  status: string;
  categoryId?: string;
}

interface ProductUpdatePayload {
  name?: string;
  stockKeepingUnit?: string;
  price?: number;
  status?: string;
  categoryId?: string;
}

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  async findAll(
    pagination: PaginationParams,
  ): Promise<{ data: ProductEntity[]; total: number }> {
    const [data, total] = await this.repository.findAndCount({
      order: {
        createdAt: 'ASC',
      },
      skip: pagination.offset,
      take: pagination.limit,
    });

    return { data, total };
  }

  async search(
    term: string,
    pagination: PaginationParams,
  ): Promise<{ data: ProductEntity[]; total: number }> {
    const searchTerm = `%${term}%`;
    const [data, total] = await this.repository
      .createQueryBuilder('product')
      .where('product.name ILIKE :searchTerm', { searchTerm })
      .orWhere('product.stockKeepingUnit ILIKE :searchTerm', { searchTerm })
      .orderBy('product.createdAt', 'ASC')
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { data, total };
  }

  findById(id: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async create(payload: ProductWritePayload): Promise<ProductEntity> {
    const product = this.repository.create(payload);
    return this.repository.save(product);
  }

  async update(
    id: string,
    payload: ProductUpdatePayload,
  ): Promise<ProductEntity | null> {
    const product = await this.findById(id);
    if (!product) {
      return null;
    }

    if (payload.name !== undefined) {
      product.name = payload.name;
    }

    if (payload.stockKeepingUnit !== undefined) {
      product.stockKeepingUnit = payload.stockKeepingUnit;
    }

    if (payload.price !== undefined) {
      product.price = payload.price;
    }

    if (payload.status !== undefined) {
      product.status = payload.status;
    }

    if (payload.categoryId !== undefined) {
      product.categoryId = payload.categoryId;
    }

    return this.repository.save(product);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
