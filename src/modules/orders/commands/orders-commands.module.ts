import { Module } from '@nestjs/common';
import { OrdersPersistenceModule } from '../orders-persistence.module';
import { OrdersQueriesModule } from '../queries/orders-queries.module';
import { OrdersCommandsService } from './orders-commands.service';

@Module({
  imports: [OrdersPersistenceModule, OrdersQueriesModule],
  providers: [OrdersCommandsService],
  exports: [OrdersCommandsService],
})
export class OrdersCommandsModule {}
