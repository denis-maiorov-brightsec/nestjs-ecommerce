import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/openapi/pagination-meta.dto';
import { ProductEntity } from './product.entity';

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: () => [ProductEntity] })
  data!: ProductEntity[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
