import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard';
import { PromotionEntity } from './promotion.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsRepository } from './promotions.repository';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PromotionEntity])],
  controllers: [PromotionsController],
  providers: [PromotionsRepository, PromotionsService, AdminTokenGuard],
})
export class PromotionsModule {}
