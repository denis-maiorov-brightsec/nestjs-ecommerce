import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createPaginatedResponse,
  PaginatedResponse,
  PaginationParams,
} from '../../common/pagination/pagination.helper';
import { CancelOrderDto } from './cancel-order.dto';
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

  async cancel(id: string, payload: CancelOrderDto = {}): Promise<OrderEntity> {
    const order = await this.findOne(id);

    if (order.status === 'cancelled') {
      return order;
    }

    if (order.status === 'shipped') {
      throw new ConflictException({
        code: 'ORDER_STATUS_CONFLICT',
        message: `Order with id "${id}" cannot be cancelled from status "shipped"`,
      });
    }

    return this.ordersRepository.cancel(order, payload.reason);
  }
}
