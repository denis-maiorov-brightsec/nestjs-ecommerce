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
import { CreateProductDto } from './create-product.dto';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './update-product.dto';

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
  create(@Body() payload: CreateProductDto) {
    return this.productsService.create(payload);
  }

  @Version('1')
  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateProductDto) {
    return this.productsService.update(id, payload);
  }

  @Version('1')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
