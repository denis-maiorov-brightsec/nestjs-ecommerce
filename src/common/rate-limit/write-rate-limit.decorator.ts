import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { WRITE_RATE_LIMIT_METADATA_KEY } from './write-rate-limit.constants';
import { WriteRateLimitGuard } from './write-rate-limit.guard';
import { WriteRateLimitOptions } from './write-rate-limit.types';

export function WriteRateLimit(
  options: WriteRateLimitOptions,
): MethodDecorator {
  return applyDecorators(
    SetMetadata(WRITE_RATE_LIMIT_METADATA_KEY, options),
    UseGuards(WriteRateLimitGuard),
  );
}
