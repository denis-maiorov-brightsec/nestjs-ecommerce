import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CategoryEntity } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  findAll(): Promise<CategoryEntity[]> {
    return this.categoriesRepository.findAll();
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    return category;
  }

  async create(payload: CreateCategoryDto): Promise<CategoryEntity> {
    await this.assertUniqueName(payload.name);
    return this.categoriesRepository.create(payload);
  }

  async update(
    id: string,
    payload: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    if (payload.name !== undefined && payload.name !== category.name) {
      await this.assertUniqueName(payload.name, category.id);
    }

    const updatedCategory = await this.categoriesRepository.update(id, payload);
    if (!updatedCategory) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.categoriesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
  }

  private async assertUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingCategory = await this.categoriesRepository.findByName(name);
    if (!existingCategory || existingCategory.id === excludeId) {
      return;
    }

    throw new ConflictException(`Category with name "${name}" already exists`);
  }
}
