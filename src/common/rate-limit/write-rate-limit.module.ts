import { Global, Module } from '@nestjs/common';
import { WriteRateLimitGuard } from './write-rate-limit.guard';
import { WriteRateLimitStore } from './write-rate-limit.store';

@Global()
@Module({
  providers: [WriteRateLimitStore, WriteRateLimitGuard],
  exports: [WriteRateLimitStore, WriteRateLimitGuard],
})
export class WriteRateLimitModule {}
