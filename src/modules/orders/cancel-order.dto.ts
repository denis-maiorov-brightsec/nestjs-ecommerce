import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
