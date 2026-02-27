import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './order.entity';
import { OrdersRepository } from './orders.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity])],
  providers: [OrdersRepository],
  exports: [OrdersRepository],
})
export class OrdersPersistenceModule {}
