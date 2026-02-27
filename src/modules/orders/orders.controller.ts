import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../../common/openapi/error-envelope.dto';
import { DEFAULT_WRITE_RATE_LIMIT } from '../../common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimit } from '../../common/rate-limit/write-rate-limit.decorator';
import { OrdersCommandsService } from './commands/orders-commands.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderEntity } from './order.entity';
import { ORDER_STATUSES } from './order-status';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { parseOrdersListQuery } from './orders-query.helper';
import type { OrdersListQuery } from './orders-query.helper';
import { OrdersQueriesService } from './queries/orders-queries.service';

const ORDERS_CANCEL_RATE_LIMIT = {
  ...DEFAULT_WRITE_RATE_LIMIT,
  key: '/v1/orders/:id/cancel',
} as const;

@ApiTags('Orders (v1)')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersQueriesService: OrdersQueriesService,
    private readonly ordersCommandsService: OrdersCommandsService,
  ) {}

  @Version('1')
  @Get()
  @ApiOperation({ summary: 'List orders with status/date filters (paginated)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ORDER_STATUSES,
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start timestamp (ISO 8601).',
    example: '2026-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End timestamp (ISO 8601).',
    example: '2026-01-31T23:59:59.000Z',
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiBadRequestResponse({
    type: ErrorEnvelopeDto,
    description: 'Invalid filters or pagination.',
  })
  findAll(@Query() query: OrdersListQuery) {
    const { filters, pagination } = parseOrdersListQuery(query);
    return this.ordersQueriesService.findAll(filters, pagination);
  }

  @Version('1')
  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderEntity })
  @ApiNotFoundResponse({ type: ErrorEnvelopeDto })
  findOne(@Param('id') id: string) {
    return this.ordersQueriesService.findOne(id);
  }

  @Version('1')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @WriteRateLimit(ORDERS_CANCEL_RATE_LIMIT)
  @ApiOperation({
    summary: 'Cancel order (state transition)',
    description:
      'Transitions an order from `pending`/`paid` to `cancelled`. Already cancelled orders return current state.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    type: OrderEntity,
    description:
      'Updated order in cancelled state (or existing cancelled order).',
  })
  @ApiBadRequestResponse({ type: ErrorEnvelopeDto })
  @ApiNotFoundResponse({ type: ErrorEnvelopeDto })
  @ApiConflictResponse({
    type: ErrorEnvelopeDto,
    description: 'Order cannot be cancelled from current state.',
    example: {
      timestamp: '2026-01-15T10:00:00.000Z',
      path: '/v1/orders/6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a/cancel',
      requestId: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a',
      error: {
        code: 'ORDER_STATUS_CONFLICT',
        message:
          'Order with id "6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a" cannot be cancelled from status "shipped"',
      },
    },
  })
  cancel(@Param('id') id: string, @Body() payload: CancelOrderDto) {
    return this.ordersCommandsService.cancel(id, payload);
  }
}
