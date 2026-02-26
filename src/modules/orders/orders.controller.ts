import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { parseOrdersListQuery } from './orders-query.helper';
import type { OrdersListQuery } from './orders-query.helper';
import { OrdersService } from './orders.service';

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
}
