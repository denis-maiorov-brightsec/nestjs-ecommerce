import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsSearchController } from './products-search.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController, ProductsSearchController],
  providers: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
