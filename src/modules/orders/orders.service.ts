import { Injectable, NotFoundException } from '@nestjs/common';
import {
  createPaginatedResponse,
  PaginatedResponse,
  PaginationParams,
} from '../../common/pagination/pagination.helper';
import { OrderEntity } from './order.entity';
import { OrderFilters } from './orders-query.helper';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async findAll(
    filters: OrderFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<OrderEntity>> {
    const { data, total } = await this.ordersRepository.findAll(
      filters,
      pagination,
    );
    return createPaginatedResponse(data, total, pagination);
  }

  async findOne(id: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }

    return order;
  }
}
