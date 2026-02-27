import { ConflictException, Injectable } from '@nestjs/common';
import { CancelOrderDto } from '../dto/cancel-order.dto';
import { OrderEntity } from '../order.entity';
import { OrdersRepository } from '../orders.repository';
import { OrdersQueriesService } from '../queries/orders-queries.service';

@Injectable()
export class OrdersCommandsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersQueriesService: OrdersQueriesService,
  ) {}

  async cancel(id: string, payload: CancelOrderDto = {}): Promise<OrderEntity> {
    const order = await this.ordersQueriesService.findOne(id);

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
