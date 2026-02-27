import type { PaginationParams } from '../../common/pagination/pagination.helper';
import { CancelOrderDto } from './cancel-order.dto';
import { OrderEntity } from './order.entity';
import { OrderFilters } from './orders-query.helper';
import { OrdersRepository } from './orders.repository';
import { OrdersCommandsService } from './commands/orders-commands.service';
import { OrdersQueriesService } from './queries/orders-queries.service';

describe('orders cqrs integration', () => {
  let repository: Pick<OrdersRepository, 'findAll' | 'findById' | 'cancel'>;
  let ordersQueriesService: OrdersQueriesService;
  let ordersCommandsService: OrdersCommandsService;
  let storedOrders: OrderEntity[];

  beforeEach(() => {
    storedOrders = [createOrder()];

    repository = {
      findAll(
        filters: OrderFilters,
        pagination: PaginationParams,
      ): Promise<{ data: OrderEntity[]; total: number }> {
        const filtered = storedOrders.filter((order) => {
          if (filters.status && order.status !== filters.status) {
            return false;
          }

          if (filters.from && order.createdAt < filters.from) {
            return false;
          }

          if (filters.to && order.createdAt > filters.to) {
            return false;
          }

          return true;
        });

        const data = filtered.slice(
          pagination.offset,
          pagination.offset + pagination.limit,
        );
        return { data, total: filtered.length };
      },

      findById(id: string): Promise<OrderEntity | null> {
        return Promise.resolve(
          storedOrders.find((order) => order.id === id) ?? null,
        );
      },

      cancel(order: OrderEntity, reason?: string): Promise<OrderEntity> {
        order.status = 'cancelled';
        order.cancelledAt = new Date('2025-01-15T10:00:00.000Z');
        order.cancellationReason = reason ?? null;
        return Promise.resolve(order);
      },
    };

    ordersQueriesService = new OrdersQueriesService(
      repository as OrdersRepository,
    );
    ordersCommandsService = new OrdersCommandsService(
      repository as OrdersRepository,
      ordersQueriesService,
    );
  });

  it('cancel command updates what detail and list queries return', async () => {
    const orderId = storedOrders[0].id;
    const payload: CancelOrderDto = {
      reason: 'Customer requested cancellation',
    };

    await ordersCommandsService.cancel(orderId, payload);

    const detail = await ordersQueriesService.findOne(orderId);
    expect(detail.status).toBe('cancelled');
    expect(detail.cancellationReason).toBe(payload.reason);

    const list = await ordersQueriesService.findAll(
      { status: 'cancelled' },
      { page: 1, limit: 20, offset: 0 },
    );
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe(orderId);
    expect(list.meta.total).toBe(1);
  });
});

function createOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return {
    id: '1f88abb6-c8ec-4aab-8f4a-ff631f7f98be',
    status: 'pending',
    customerId: 'customer-123',
    items: [],
    currency: 'USD',
    totalAmount: 120,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2025-01-10T10:00:00.000Z'),
    updatedAt: new Date('2025-01-10T10:00:00.000Z'),
    ...overrides,
  };
}
