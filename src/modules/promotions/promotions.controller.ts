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
  UseGuards,
  Version,
} from '@nestjs/common';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard';
import { CreatePromotionDto } from './create-promotion.dto';
import { PromotionsService } from './promotions.service';
import { UpdatePromotionDto } from './update-promotion.dto';

@UseGuards(AdminTokenGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Version('1')
  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  @Version('1')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Version('1')
  @Post()
  create(@Body() payload: CreatePromotionDto) {
    return this.promotionsService.create(payload);
  }

  @Version('1')
  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdatePromotionDto) {
    return this.promotionsService.update(id, payload);
  }

  @Version('1')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
