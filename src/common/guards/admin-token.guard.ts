import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

const ADMIN_TOKEN_HEADER = 'x-admin-token';
const DEFAULT_ADMIN_TOKEN = 'local-admin-token';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const headerValue = request.headers[ADMIN_TOKEN_HEADER];
    const providedToken = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    const expectedToken = process.env.ADMIN_TOKEN ?? DEFAULT_ADMIN_TOKEN;

    if (!providedToken || providedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid or missing admin token');
    }

    return true;
  }
}
