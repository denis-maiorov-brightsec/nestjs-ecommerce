import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PROMOTION_TYPES } from './promotion-type';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(PROMOTION_TYPES)
  type!: (typeof PROMOTION_TYPES)[number];

  @IsNumber()
  value!: number;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
