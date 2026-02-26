import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './category.entity';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update-category.dto';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly repository: Repository<CategoryEntity>,
  ) {}

  findAll(): Promise<CategoryEntity[]> {
    return this.repository.find({
      order: {
        createdAt: 'ASC',
      },
    });
  }

  findById(id: string): Promise<CategoryEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  findByName(name: string): Promise<CategoryEntity | null> {
    return this.repository.findOne({
      where: { name },
    });
  }

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    const category = this.repository.create(payload);
    return this.repository.save(category);
  }

  async update(
    id: string,
    payload: UpdateCategoryDto,
  ): Promise<CategoryEntity | null> {
    const category = await this.findById(id);
    if (!category) {
      return null;
    }

    if (payload.name !== undefined) {
      category.name = payload.name;
    }

    if (payload.description !== undefined) {
      category.description = payload.description;
    }

    if (payload.isActive !== undefined) {
      category.isActive = payload.isActive;
    }

    return this.repository.save(category);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
