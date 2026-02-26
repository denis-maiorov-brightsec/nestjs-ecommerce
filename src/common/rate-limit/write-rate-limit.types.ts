export interface WriteRateLimitOptions {
  limit: number;
  windowSeconds: number;
  key: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}
