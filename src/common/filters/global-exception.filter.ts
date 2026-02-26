import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorDetails = Array<{ field: string; constraints: string[] }>;

interface ErrorBody {
  code: string;
  message: string;
  details?: ErrorDetails;
}

const DEFAULT_ERROR_BY_STATUS: Record<number, Omit<ErrorBody, 'details'>> = {
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
    const request = context.getRequest<Request>();
    const status = this.getStatus(exception);

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
}
