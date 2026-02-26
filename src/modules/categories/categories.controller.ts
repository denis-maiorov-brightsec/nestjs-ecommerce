import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Version,
} from '@nestjs/common';
import { DEFAULT_WRITE_RATE_LIMIT } from '../../common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimit } from '../../common/rate-limit/write-rate-limit.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update-category.dto';

const CATEGORIES_WRITE_RATE_LIMIT = {
  ...DEFAULT_WRITE_RATE_LIMIT,
  key: '/v1/categories*',
} as const;

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Version('1')
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Version('1')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Version('1')
  @Post()
  @WriteRateLimit(CATEGORIES_WRITE_RATE_LIMIT)
  create(@Body() payload: CreateCategoryDto) {
    return this.categoriesService.create(payload);
  }

  @Version('1')
  @Patch(':id')
  @WriteRateLimit(CATEGORIES_WRITE_RATE_LIMIT)
  update(@Param('id') id: string, @Body() payload: UpdateCategoryDto) {
    return this.categoriesService.update(id, payload);
  }

  @Version('1')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WriteRateLimit(CATEGORIES_WRITE_RATE_LIMIT)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
