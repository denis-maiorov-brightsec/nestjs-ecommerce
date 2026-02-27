import { Module } from '@nestjs/common';
import { OrdersCommandsModule } from './commands/orders-commands.module';
import { OrdersController } from './orders.controller';
import { OrdersQueriesModule } from './queries/orders-queries.module';

@Module({
  imports: [OrdersQueriesModule, OrdersCommandsModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
