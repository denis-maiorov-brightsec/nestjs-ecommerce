import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePromotionDto } from './create-promotion.dto';
import { PromotionEntity } from './promotion.entity';
import { PromotionType } from './promotion-type';
import { PromotionsRepository } from './promotions.repository';
import { UpdatePromotionDto } from './update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly promotionsRepository: PromotionsRepository) {}

  findAll(): Promise<PromotionEntity[]> {
    return this.promotionsRepository.findAll();
  }

  async findOne(id: string): Promise<PromotionEntity> {
    const promotion = await this.promotionsRepository.findById(id);
    if (!promotion) {
      throw new NotFoundException(`Promotion with id "${id}" not found`);
    }

    return promotion;
  }

  async create(payload: CreatePromotionDto): Promise<PromotionEntity> {
    this.assertValidTypeValue(payload.type, payload.value);
    return this.promotionsRepository.create(payload);
  }

  async update(
    id: string,
    payload: UpdatePromotionDto,
  ): Promise<PromotionEntity> {
    const promotion = await this.findOne(id);
    const type = payload.type ?? promotion.type;
    const value = payload.value ?? promotion.value;

    this.assertValidTypeValue(type, value);

    const updatedPromotion = await this.promotionsRepository.update(
      id,
      payload,
    );
    if (!updatedPromotion) {
      throw new NotFoundException(`Promotion with id "${id}" not found`);
    }

    return updatedPromotion;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.promotionsRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Promotion with id "${id}" not found`);
    }
  }

  private assertValidTypeValue(type: PromotionType, value: number): void {
    if (type === 'percentage' && (value < 1 || value > 100)) {
      throw new BadRequestException(
        '"value" must be between 1 and 100 for "percentage" promotions',
      );
    }

    if (type === 'fixed' && value <= 0) {
      throw new BadRequestException(
        '"value" must be greater than 0 for "fixed" promotions',
      );
    }
  }
}
