import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationParams } from '../../common/pagination/pagination.helper';
import { OrderEntity } from './order.entity';
import { OrderFilters } from './orders-query.helper';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly repository: Repository<OrderEntity>,
  ) {}

  async findAll(
    filters: OrderFilters,
    pagination: PaginationParams,
  ): Promise<{ data: OrderEntity[]; total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('orders');

    if (filters.status) {
      queryBuilder.andWhere('orders.status = :status', {
        status: filters.status,
      });
    }

    if (filters.from) {
      queryBuilder.andWhere('orders.createdAt >= :from', {
        from: filters.from,
      });
    }

    if (filters.to) {
      queryBuilder.andWhere('orders.createdAt <= :to', {
        to: filters.to,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy('orders.createdAt', 'ASC')
      .addOrderBy('orders.id', 'ASC')
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { data, total };
  }

  findById(id: string): Promise<OrderEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async cancel(order: OrderEntity, reason?: string): Promise<OrderEntity> {
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason ?? null;

    return this.repository.save(order);
  }
}
