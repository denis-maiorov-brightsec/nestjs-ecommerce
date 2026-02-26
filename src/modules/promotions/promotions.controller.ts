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
import { DEFAULT_WRITE_RATE_LIMIT } from '../../common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimit } from '../../common/rate-limit/write-rate-limit.decorator';
import { CreatePromotionDto } from './create-promotion.dto';
import { PromotionsService } from './promotions.service';
import { UpdatePromotionDto } from './update-promotion.dto';

const PROMOTIONS_WRITE_RATE_LIMIT = {
  ...DEFAULT_WRITE_RATE_LIMIT,
  key: '/v1/promotions*',
} as const;

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
  @WriteRateLimit(PROMOTIONS_WRITE_RATE_LIMIT)
  create(@Body() payload: CreatePromotionDto) {
    return this.promotionsService.create(payload);
  }

  @Version('1')
  @Patch(':id')
  @WriteRateLimit(PROMOTIONS_WRITE_RATE_LIMIT)
  update(@Param('id') id: string, @Body() payload: UpdatePromotionDto) {
    return this.promotionsService.update(id, payload);
  }

  @Version('1')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WriteRateLimit(PROMOTIONS_WRITE_RATE_LIMIT)
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
