import { Module } from '@nestjs/common';
import { OrdersPersistenceModule } from '../orders-persistence.module';
import { OrdersQueriesService } from './orders-queries.service';

@Module({
  imports: [OrdersPersistenceModule],
  providers: [OrdersQueriesService],
  exports: [OrdersQueriesService],
})
export class OrdersQueriesModule {}
