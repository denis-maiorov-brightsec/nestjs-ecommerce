import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [DatabaseModule, ProductsModule, CategoriesModule, OrdersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
