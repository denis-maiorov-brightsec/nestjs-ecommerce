import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

type RequestWithId = Request & {
  requestId?: string;
  requestStartedAtMs?: number;
  structuredLogWritten?: boolean;
};

interface StructuredLogPayload {
  requestId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

type LogWriter = (message: string) => void;
type TimeProvider = () => number;

@Injectable()
export class StructuredLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly writeLog: LogWriter = (message: string) => {
      console.log(message);
    },
    private readonly getTimeMs: TimeProvider = () => Date.now(),
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();
    const startedAt = request.requestStartedAtMs ?? this.getTimeMs();

    const log = (statusCode: number): void => {
      request.structuredLogWritten = true;

      const payload: StructuredLogPayload = {
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
        durationMs: Math.max(0, this.getTimeMs() - startedAt),
        timestamp: new Date().toISOString(),
      };

      const userAgent = request.header('user-agent');
      if (typeof userAgent === 'string' && userAgent !== '') {
        payload.userAgent = userAgent;
      }

      if (typeof request.ip === 'string' && request.ip !== '') {
        payload.ip = request.ip;
      }

      this.writeLog(JSON.stringify(payload));
    };

    return next.handle().pipe(
      tap(() => log(response.statusCode)),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        log(statusCode);
        return throwError(() => error);
      }),
    );
  }
}
