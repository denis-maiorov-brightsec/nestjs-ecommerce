import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import { parsePaginationQuery } from '../../common/pagination/pagination.helper';
import type { PaginationQuery } from '../../common/pagination/pagination.helper';
import { DEFAULT_WRITE_RATE_LIMIT } from '../../common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimit } from '../../common/rate-limit/write-rate-limit.decorator';
import { CreateProductDto } from './create-product.dto';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './update-product.dto';

const PRODUCTS_WRITE_RATE_LIMIT = {
  ...DEFAULT_WRITE_RATE_LIMIT,
  key: '/v1/products*',
} as const;

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Version('1')
  @Get()
  findAll(@Query() query: PaginationQuery) {
    return this.productsService.findAll(parsePaginationQuery(query));
  }

  @Version('1')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Version('1')
  @Post()
  @WriteRateLimit(PRODUCTS_WRITE_RATE_LIMIT)
  create(@Body() payload: CreateProductDto) {
    return this.productsService.create(payload);
  }

  @Version('1')
  @Patch(':id')
  @WriteRateLimit(PRODUCTS_WRITE_RATE_LIMIT)
  update(@Param('id') id: string, @Body() payload: UpdateProductDto) {
    return this.productsService.update(id, payload);
  }

  @Version('1')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WriteRateLimit(PRODUCTS_WRITE_RATE_LIMIT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
