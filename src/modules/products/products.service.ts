import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async search(
    term: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductEntity>> {
    const { data, total } = await this.productsRepository.search(
      term,
      pagination,
    );
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
    this.assertStockKeepingUnitAliasCompatibility(payload);
    const stockKeepingUnit = this.resolveStockKeepingUnit(payload, true);

    return this.productsRepository.create({
      name: payload.name,
      stockKeepingUnit,
      price: payload.price,
      status: payload.status,
      categoryId: payload.categoryId,
    });
  }

  async update(id: string, payload: UpdateProductDto): Promise<ProductEntity> {
    this.assertStockKeepingUnitAliasCompatibility(payload);
    const stockKeepingUnit = this.resolveStockKeepingUnit(payload, false);

    const product = await this.productsRepository.update(id, {
      name: payload.name,
      stockKeepingUnit,
      price: payload.price,
      status: payload.status,
      categoryId: payload.categoryId,
    });
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

  private assertStockKeepingUnitAliasCompatibility(payload: {
    stockKeepingUnit?: string;
    sku?: string;
  }): void {
    if (
      payload.stockKeepingUnit !== undefined &&
      payload.sku !== undefined &&
      payload.stockKeepingUnit !== payload.sku
    ) {
      throw new BadRequestException(
        '"stockKeepingUnit" and deprecated "sku" must match when both are provided',
      );
    }
  }

  private resolveStockKeepingUnit(
    payload: {
      stockKeepingUnit?: string;
      sku?: string;
    },
    required: true,
  ): string;
  private resolveStockKeepingUnit(
    payload: {
      stockKeepingUnit?: string;
      sku?: string;
    },
    required: false,
  ): string | undefined;
  private resolveStockKeepingUnit(
    payload: {
      stockKeepingUnit?: string;
      sku?: string;
    },
    required: boolean,
  ): string | undefined {
    const stockKeepingUnit = payload.stockKeepingUnit ?? payload.sku;
    if (required && stockKeepingUnit === undefined) {
      throw new BadRequestException('"stockKeepingUnit" is required');
    }

    return stockKeepingUnit;
  }
}
