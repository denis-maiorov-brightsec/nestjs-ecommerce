import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({ example: 'name' })
  field!: string;

  @ApiProperty({
    type: [String],
    example: ['name should not be empty', 'name must be a string'],
  })
  constraints!: string[];
}

export class ErrorBodyDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Request validation failed' })
  message!: string;

  @ApiPropertyOptional({ type: () => [ErrorDetailDto] })
  details?: ErrorDetailDto[];
}

export class ErrorEnvelopeDto {
  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/v1/products' })
  path!: string;

  @ApiProperty({ example: '6dcbdf30-b8ee-4bb8-9e7d-5ed4fcf4a43a' })
  requestId!: string;

  @ApiProperty({ type: () => ErrorBodyDto })
  error!: ErrorBodyDto;
}
