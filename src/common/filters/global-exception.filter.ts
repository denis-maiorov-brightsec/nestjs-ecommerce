import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../request-id/request-id.constants';

type ErrorDetails = Array<{ field: string; constraints: string[] }>;
type RequestWithId = Request & {
  requestId?: string;
  requestStartedAtMs?: number;
  structuredLogWritten?: boolean;
};

interface ErrorBody {
  code: string;
  message: string;
  details?: ErrorDetails;
}

const DEFAULT_ERROR_BY_STATUS: Record<number, Omit<ErrorBody, 'details'>> = {
  [HttpStatus.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    message: 'Unauthorized',
  },
  [HttpStatus.BAD_REQUEST]: {
    code: 'BAD_REQUEST',
    message: 'Bad request',
  },
  [HttpStatus.NOT_FOUND]: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
  },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    message: 'Conflict',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId>();
    const status = this.getStatus(exception);
    const requestId = this.getRequestId(request, response);
    this.logUnhandledRequest(request, status, requestId);

    const responsePayload = this.getResponsePayload(exception);
    const defaultError =
      DEFAULT_ERROR_BY_STATUS[status] ??
      DEFAULT_ERROR_BY_STATUS[HttpStatus.INTERNAL_SERVER_ERROR];
    const message = this.getMessage(
      status,
      responsePayload,
      defaultError.message,
    );
    const details = this.getDetails(responsePayload);
    const code =
      this.getCode(responsePayload) ??
      (status === 500 ? 'INTERNAL_ERROR' : defaultError.code);

    response.status(status).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getResponsePayload(exception: unknown): unknown {
    if (exception instanceof HttpException) {
      return exception.getResponse();
    }

    return undefined;
  }

  private getCode(payload: unknown): string | undefined {
    if (this.isObject(payload) && typeof payload.code === 'string') {
      return payload.code;
    }

    return undefined;
  }

  private getDetails(payload: unknown): ErrorDetails | undefined {
    if (!this.isObject(payload) || !Array.isArray(payload.details)) {
      return undefined;
    }

    const details = payload.details.filter((detail: unknown) => {
      if (!this.isObject(detail)) {
        return false;
      }

      return (
        typeof detail.field === 'string' &&
        Array.isArray(detail.constraints) &&
        detail.constraints.every(
          (constraint: unknown) => typeof constraint === 'string',
        )
      );
    }) as ErrorDetails;

    return details.length > 0 ? details : undefined;
  }

  private getMessage(
    status: number,
    payload: unknown,
    defaultMessage: string,
  ): string {
    if (status === 500) {
      return DEFAULT_ERROR_BY_STATUS[HttpStatus.INTERNAL_SERVER_ERROR].message;
    }

    if (this.isObject(payload)) {
      if (typeof payload.message === 'string') {
        return payload.message;
      }

      if (Array.isArray(payload.message) && payload.message.length > 0) {
        const firstMessage = payload.message.find(
          (message: unknown) => typeof message === 'string',
        );
        if (typeof firstMessage === 'string') {
          return firstMessage;
        }
      }
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return defaultMessage;
  }

  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
  }

  private getRequestId(request: RequestWithId, response: Response): string {
    if (typeof request.requestId === 'string' && request.requestId !== '') {
      return request.requestId;
    }

    const headerValue = response.getHeader(REQUEST_ID_HEADER);
    if (typeof headerValue === 'string' && headerValue !== '') {
      return headerValue;
    }

    return 'unknown';
  }

  private logUnhandledRequest(
    request: RequestWithId,
    statusCode: number,
    requestId: string,
  ): void {
    if (request.structuredLogWritten) {
      return;
    }

    request.structuredLogWritten = true;
    const startedAt = request.requestStartedAtMs ?? Date.now();
    const payload: Record<string, unknown> = {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      durationMs: Math.max(0, Date.now() - startedAt),
      timestamp: new Date().toISOString(),
    };

    const userAgent = request.header('user-agent');
    if (typeof userAgent === 'string' && userAgent !== '') {
      payload.userAgent = userAgent;
    }

    if (typeof request.ip === 'string' && request.ip !== '') {
      payload.ip = request.ip;
    }

    console.log(JSON.stringify(payload));
  }
}
