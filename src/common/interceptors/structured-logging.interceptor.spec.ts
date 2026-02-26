import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { StructuredLoggingInterceptor } from './structured-logging.interceptor';

interface MockRequest {
  requestId?: string;
  method: string;
  url: string;
  originalUrl?: string;
  ip?: string;
  header: (name: string) => string | undefined;
}

interface MockResponse {
  statusCode: number;
}

describe('StructuredLoggingInterceptor', () => {
  function createExecutionContext(
    request: MockRequest,
    response: MockResponse,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
  }

  function parseLoggedPayload(logCalls: string[][]) {
    expect(logCalls).toHaveLength(1);
    return JSON.parse(logCalls[0][0]) as Record<string, unknown>;
  }

  it('logs required payload keys for successful requests', (done) => {
    const logCalls: string[][] = [];
    const interceptor = new StructuredLoggingInterceptor(
      (message) => {
        logCalls.push([message]);
      },
      (() => {
        let tick = 1_000;
        return () => {
          tick += 11;
          return tick;
        };
      })(),
    );
    const request: MockRequest = {
      requestId: 'req-123',
      method: 'GET',
      url: '/v1/health',
      originalUrl: '/v1/health',
      ip: '127.0.0.1',
      header: (name: string) =>
        name.toLowerCase() === 'user-agent' ? 'jest' : undefined,
    };
    const response: MockResponse = { statusCode: 200 };
    const next: CallHandler = {
      handle: () => of({ status: 'ok' }),
    };

    interceptor
      .intercept(createExecutionContext(request, response), next)
      .subscribe({
        complete: () => {
          const payload = parseLoggedPayload(logCalls);
          expect(payload).toMatchObject({
            requestId: 'req-123',
            method: 'GET',
            path: '/v1/health',
            statusCode: 200,
            userAgent: 'jest',
            ip: '127.0.0.1',
          });
          expect(typeof payload.durationMs).toBe('number');
          expect(typeof payload.timestamp).toBe('string');
          done();
        },
      });
  });

  it('logs error status code and required keys for failed requests', (done) => {
    const logCalls: string[][] = [];
    const interceptor = new StructuredLoggingInterceptor((message) => {
      logCalls.push([message]);
    });
    const request: MockRequest = {
      requestId: 'req-456',
      method: 'POST',
      url: '/v1/test/validation',
      originalUrl: '/v1/test/validation',
      header: () => undefined,
    };
    const response: MockResponse = { statusCode: 200 };
    const next: CallHandler = {
      handle: () =>
        throwError(() => new BadRequestException('Invalid request')),
    };

    interceptor
      .intercept(createExecutionContext(request, response), next)
      .subscribe({
        error: () => {
          const payload = parseLoggedPayload(logCalls);
          expect(payload).toMatchObject({
            requestId: 'req-456',
            method: 'POST',
            path: '/v1/test/validation',
            statusCode: 400,
          });
          expect(typeof payload.durationMs).toBe('number');
          expect(typeof payload.timestamp).toBe('string');
          done();
        },
        complete: () => {
          done.fail('Expected request to fail');
        },
      });
  });
});
