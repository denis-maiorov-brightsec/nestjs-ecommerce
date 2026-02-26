import { Injectable } from '@nestjs/common';
import { RateLimitCheckResult } from './write-rate-limit.types';

interface RateLimitEntry {
  windowStartMs: number;
  count: number;
}

@Injectable()
export class WriteRateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();

  consume(
    key: string,
    limit: number,
    windowSeconds: number,
    now = Date.now(),
  ): RateLimitCheckResult {
    const windowMs = windowSeconds * 1000;
    const entry = this.store.get(key);

    // Fixed-window strategy: each key gets a counter that resets after windowMs.
    if (!entry || now - entry.windowStartMs >= windowMs) {
      this.store.set(key, { windowStartMs: now, count: 1 });
      return { allowed: true };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((windowMs - (now - entry.windowStartMs)) / 1000),
        ),
      };
    }

    entry.count += 1;
    return { allowed: true };
  }

  reset(): void {
    this.store.clear();
  }
}
