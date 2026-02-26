import { Injectable, NotFoundException } from '@nestjs/common';
import {
  createPaginatedResponse,
  PaginatedResponse,
  PaginationParams,
} from '../../common/pagination/pagination.helper';
import { CreateProductDto } from './create-product.dto';
import { ProductEntity } from './product.entity';
import { ProductsRepository } from './products.repository';
import { UpdateProductDto } from './update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll(
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductEntity>> {
    const { data, total } = await this.productsRepository.findAll(pagination);
    return createPaginatedResponse(data, total, pagination);
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
  }

  create(payload: CreateProductDto): Promise<ProductEntity> {
    return this.productsRepository.create(payload);
  }

  async update(id: string, payload: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.productsRepository.update(id, payload);
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }

    return product;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.productsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
  }
}
