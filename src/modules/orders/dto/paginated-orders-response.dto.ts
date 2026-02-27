import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/openapi/pagination-meta.dto';
import { OrderEntity } from '../order.entity';

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: () => [OrderEntity] })
  data!: OrderEntity[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}
