import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './create-product.dto';
import { ProductEntity } from './product.entity';
import { UpdateProductDto } from './update-product.dto';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repository: Repository<ProductEntity>,
  ) {}

  findAll(): Promise<ProductEntity[]> {
    return this.repository.find({
      order: {
        createdAt: 'ASC',
      },
    });
  }

  findById(id: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async create(payload: CreateProductDto): Promise<ProductEntity> {
    const product = this.repository.create(payload);
    return this.repository.save(product);
  }

  async update(
    id: string,
    payload: UpdateProductDto,
  ): Promise<ProductEntity | null> {
    const product = await this.findById(id);
    if (!product) {
      return null;
    }

    if (payload.name !== undefined) {
      product.name = payload.name;
    }

    if (payload.sku !== undefined) {
      product.sku = payload.sku;
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
