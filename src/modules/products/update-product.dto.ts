import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Laptop Pro' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'LP-001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  stockKeepingUnit?: string;

  // Deprecated request alias retained temporarily for backward compatibility.
  @ApiPropertyOptional({
    example: 'LP-001',
    deprecated: true,
    description:
      'Deprecated request alias for stockKeepingUnit. Keep values identical when both are sent.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @ApiPropertyOptional({ example: 1499.99, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 'inactive' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;

  @ApiPropertyOptional({ example: 'c-electronics' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;
}
