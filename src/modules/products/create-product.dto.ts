import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf(
    ({ stockKeepingUnit, sku }: CreateProductDto) =>
      stockKeepingUnit !== undefined || sku === undefined,
  )
  @IsString()
  @IsNotEmpty()
  stockKeepingUnit?: string;

  // Deprecated request alias retained temporarily for backward compatibility.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;
}
