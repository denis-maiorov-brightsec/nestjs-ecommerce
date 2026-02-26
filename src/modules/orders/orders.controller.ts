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
import { DEFAULT_WRITE_RATE_LIMIT } from '../../common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimit } from '../../common/rate-limit/write-rate-limit.decorator';
import { CancelOrderDto } from './cancel-order.dto';
import { parseOrdersListQuery } from './orders-query.helper';
import type { OrdersListQuery } from './orders-query.helper';
import { OrdersService } from './orders.service';

const ORDERS_CANCEL_RATE_LIMIT = {
  ...DEFAULT_WRITE_RATE_LIMIT,
  key: '/v1/orders/:id/cancel',
} as const;

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Version('1')
  @Get()
  findAll(@Query() query: OrdersListQuery) {
    const { filters, pagination } = parseOrdersListQuery(query);
    return this.ordersService.findAll(filters, pagination);
  }

  @Version('1')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Version('1')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @WriteRateLimit(ORDERS_CANCEL_RATE_LIMIT)
  cancel(@Param('id') id: string, @Body() payload: CancelOrderDto) {
    return this.ordersService.cancel(id, payload);
  }
}
