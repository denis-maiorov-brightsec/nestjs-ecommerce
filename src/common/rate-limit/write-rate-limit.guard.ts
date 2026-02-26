import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { WRITE_RATE_LIMIT_METADATA_KEY } from './write-rate-limit.constants';
import { WriteRateLimitStore } from './write-rate-limit.store';
import { WriteRateLimitOptions } from './write-rate-limit.types';

@Injectable()
export class WriteRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly writeRateLimitStore: WriteRateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<WriteRateLimitOptions>(
      WRITE_RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const key = `${request.ip}:${request.method}:${options.key}`;
    const { allowed, retryAfterSeconds } = this.writeRateLimitStore.consume(
      key,
      options.limit,
      options.windowSeconds,
    );

    if (allowed) {
      return true;
    }

    response.setHeader('Retry-After', String(retryAfterSeconds ?? 1));
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
