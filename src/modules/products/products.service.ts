import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
import { ProductEntity } from './product.entity';
import { ProductsRepository } from './products.repository';
import { UpdateProductDto } from './update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  findAll(): Promise<ProductEntity[]> {
    return this.productsRepository.findAll();
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
