# Spec 011: Request ID + Structured Logging Interceptor

## Goal
Introduce request traceability and machine-readable request logs.

## Scope
- Add request-id middleware:
  - Generate UUID when `x-request-id` absent.
  - Echo request id in response header.
- Add structured logging interceptor with JSON logs.
- Extend global error envelope (spec 002) to include `requestId`.

## Out of scope
- External log transport (ELK/Datadog).
- Distributed tracing spans.

## Log payload fields
- `requestId`
- `method`
- `path`
- `statusCode`
- `durationMs`
- `timestamp`
- optional `userAgent`, `ip`

## Acceptance criteria
- Every response includes `x-request-id`.
- Every request emits one structured log entry.
- Error responses include same `requestId` value as header.

## Verification
- Tests for request id generation/propagation.
- Interceptor tests asserting structured payload keys.
