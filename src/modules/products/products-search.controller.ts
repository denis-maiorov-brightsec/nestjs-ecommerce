import { Controller, Get, Query, Version } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error-envelope.dto';
import { parsePaginationQuery } from '../../common/pagination/pagination.helper';
import { PaginatedProductsResponseDto } from './paginated-products-response.dto';
import { ProductsService } from './products.service';
import { SearchProductsQueryDto } from './search-products-query.dto';

@ApiTags('Products (v1)')
@Controller('search/products')
export class ProductsSearchController {
  constructor(private readonly productsService: ProductsService) {}

  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Search products by name or stockKeepingUnit' })
  @ApiOkResponse({
    type: PaginatedProductsResponseDto,
    description: 'Paginated search result.',
  })
  @ApiBadRequestResponse({
    type: ErrorEnvelopeDto,
    description: 'Validation error when q is missing or too short.',
  })
  search(@Query() query: SearchProductsQueryDto) {
    return this.productsService.search(query.q, parsePaginationQuery(query));
  }
}
