import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'LP-001',
    description: 'Primary SKU field used in API responses.',
  })
  @ValidateIf(
    ({ stockKeepingUnit, sku }: CreateProductDto) =>
      stockKeepingUnit !== undefined || sku === undefined,
  )
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

  @ApiProperty({ example: 1299.99, minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 'active' })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional({ example: 'c-electronics' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;
}
