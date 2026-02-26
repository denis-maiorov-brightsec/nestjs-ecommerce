import { IsOptional, IsString, MinLength } from 'class-validator';
import type { PaginationQuery } from '../../common/pagination/pagination.helper';

export class SearchProductsQueryDto implements PaginationQuery {
  @IsString()
  @MinLength(2)
  q!: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
