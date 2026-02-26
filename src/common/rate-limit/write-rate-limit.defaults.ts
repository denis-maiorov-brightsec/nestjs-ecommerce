import { WriteRateLimitOptions } from './write-rate-limit.types';

export const DEFAULT_WRITE_RATE_LIMIT: Pick<
  WriteRateLimitOptions,
  'limit' | 'windowSeconds'
> = {
  limit: 20,
  windowSeconds: 60,
};
