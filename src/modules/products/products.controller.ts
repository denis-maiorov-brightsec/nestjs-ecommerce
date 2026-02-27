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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error-envelope.dto';
import { parsePaginationQuery } from '../../common/pagination/pagination.helper';
import type { PaginationQuery } from '../../common/pagination/pagination.helper';
import { DEFAULT_WRITE_RATE_LIMIT } from '../../common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimit } from '../../common/rate-limit/write-rate-limit.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginatedProductsResponseDto } from './dto/paginated-products-response.dto';
import { ProductEntity } from './product.entity';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCTS_WRITE_RATE_LIMIT = {
  ...DEFAULT_WRITE_RATE_LIMIT,
  key: '/v1/products*',
} as const;

@ApiTags('Products (v1)')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Version('1')
  @Get()
  @ApiOperation({ summary: 'List products (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiOkResponse({
    type: PaginatedProductsResponseDto,
    description: 'Paginated products list.',
  })
  @ApiBadRequestResponse({
    type: ErrorEnvelopeDto,
    description: 'Invalid pagination query.',
    example: {
      timestamp: '2026-01-15T10:00:00.000Z',
      path: '/v1/products?page=0',
      requestId: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a',
      error: {
        code: 'BAD_REQUEST',
        message: '"page" must be a positive integer',
      },
    },
  })
  findAll(@Query() query: PaginationQuery) {
    return this.productsService.findAll(parsePaginationQuery(query));
  }

  @Version('1')
  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProductEntity })
  @ApiNotFoundResponse({
    type: ErrorEnvelopeDto,
    example: {
      timestamp: '2026-01-15T10:00:00.000Z',
      path: '/v1/products/unknown-id',
      requestId: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a',
      error: {
        code: 'NOT_FOUND',
        message: 'Product with id "unknown-id" not found',
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Version('1')
  @Post()
  @WriteRateLimit(PRODUCTS_WRITE_RATE_LIMIT)
  @ApiOperation({
    summary: 'Create product',
    description:
      'Request supports deprecated `sku` alias for backward compatibility.',
  })
  @ApiCreatedResponse({ type: ProductEntity })
  @ApiBadRequestResponse({
    type: ErrorEnvelopeDto,
    description: 'Validation or payload compatibility error.',
    example: {
      timestamp: '2026-01-15T10:00:00.000Z',
      path: '/v1/products',
      requestId: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a',
      error: {
        code: 'BAD_REQUEST',
        message:
          '"stockKeepingUnit" and deprecated "sku" must match when both are provided',
      },
    },
  })
  create(@Body() payload: CreateProductDto) {
    return this.productsService.create(payload);
  }

  @Version('1')
  @Patch(':id')
  @WriteRateLimit(PRODUCTS_WRITE_RATE_LIMIT)
  @ApiOperation({ summary: 'Update product by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProductEntity })
  @ApiBadRequestResponse({ type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ type: ErrorEnvelopeDto })
  update(@Param('id') id: string, @Body() payload: UpdateProductDto) {
    return this.productsService.update(id, payload);
  }

  @Version('1')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WriteRateLimit(PRODUCTS_WRITE_RATE_LIMIT)
  @ApiOperation({ summary: 'Delete product by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Product deleted.' })
  @ApiNotFoundResponse({ type: ErrorEnvelopeDto })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
