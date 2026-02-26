import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePromotionDto } from './create-promotion.dto';
import { PromotionEntity } from './promotion.entity';
import { UpdatePromotionDto } from './update-promotion.dto';

@Injectable()
export class PromotionsRepository {
  constructor(
    @InjectRepository(PromotionEntity)
    private readonly repository: Repository<PromotionEntity>,
  ) {}

  findAll(): Promise<PromotionEntity[]> {
    return this.repository.find({
      order: {
        createdAt: 'ASC',
      },
    });
  }

  findById(id: string): Promise<PromotionEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async create(payload: CreatePromotionDto): Promise<PromotionEntity> {
    const promotion = this.repository.create({
      name: payload.name,
      type: payload.type,
      value: payload.value,
      isActive: payload.isActive,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
    });

    return this.repository.save(promotion);
  }

  async update(
    id: string,
    payload: UpdatePromotionDto,
  ): Promise<PromotionEntity | null> {
    const promotion = await this.findById(id);
    if (!promotion) {
      return null;
    }

    if (payload.name !== undefined) {
      promotion.name = payload.name;
    }

    if (payload.type !== undefined) {
      promotion.type = payload.type;
    }

    if (payload.value !== undefined) {
      promotion.value = payload.value;
    }

    if (payload.isActive !== undefined) {
      promotion.isActive = payload.isActive;
    }

    if (payload.startsAt !== undefined) {
      promotion.startsAt = new Date(payload.startsAt);
    }

    if (payload.endsAt !== undefined) {
      promotion.endsAt = new Date(payload.endsAt);
    }

    return this.repository.save(promotion);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
