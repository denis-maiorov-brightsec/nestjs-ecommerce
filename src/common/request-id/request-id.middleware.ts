import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.constants';

type RequestWithId = Request & {
  requestId?: string;
  requestStartedAtMs?: number;
  structuredLogWritten?: boolean;
};

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestWithId = request as RequestWithId;
  const incomingRequestId = request.header(REQUEST_ID_HEADER);
  const requestId =
    typeof incomingRequestId === 'string' && incomingRequestId.trim() !== ''
      ? incomingRequestId
      : randomUUID();

  requestWithId.requestId = requestId;
  requestWithId.requestStartedAtMs = Date.now();
  requestWithId.structuredLogWritten = false;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
