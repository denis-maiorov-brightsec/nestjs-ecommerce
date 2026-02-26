import { Controller, Get, Query, Version } from '@nestjs/common';
import { parsePaginationQuery } from '../../common/pagination/pagination.helper';
import { ProductsService } from './products.service';
import { SearchProductsQueryDto } from './search-products-query.dto';

@Controller('search/products')
export class ProductsSearchController {
  constructor(private readonly productsService: ProductsService) {}

  @Version('1')
  @Get()
  search(@Query() query: SearchProductsQueryDto) {
    return this.productsService.search(query.q, parsePaginationQuery(query));
  }
}
