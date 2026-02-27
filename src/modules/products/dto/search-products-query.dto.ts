import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaginationQuery } from '../../../common/pagination/pagination.helper';

export class SearchProductsQueryDto implements PaginationQuery {
  @ApiProperty({
    example: 'lap',
    minLength: 2,
    description:
      'Case-insensitive search over product name and stockKeepingUnit.',
  })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  limit?: string;
}
