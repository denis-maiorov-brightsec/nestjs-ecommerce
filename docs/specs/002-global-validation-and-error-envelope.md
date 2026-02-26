# Spec 002: Global Validation Pipe + Consistent Error Envelope

## Goal
Standardize request validation and error responses before resource APIs expand.

## Scope
- Register global `ValidationPipe` in bootstrap.
- Add a global exception filter that normalizes all errors to one response shape.
- Ensure DTO validation errors from `class-validator` are mapped into structured `details`.

## Out of scope
- Request ID injection (added later in spec 011).
- Logging interceptor.

## Response contract
Error response format:
```json
{
  "timestamp": "2026-02-26T12:00:00.000Z",
  "path": "/v1/products",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "name", "constraints": ["name should not be empty"] }
    ]
  }
}
```

## Implementation notes
- `ValidationPipe` settings: `whitelist`, `forbidNonWhitelisted`, `transform`.
- Map common HTTP exceptions (`400`, `404`, `409`, `429`, `500`) into stable codes.
- Keep transport status code aligned with HTTP semantics.

## Acceptance criteria
- Invalid payloads return `400` with envelope above (same top-level shape for all errors).
- Unknown runtime errors return `500` with sanitized message.
- Existing happy-path routes still work unchanged.

## Verification
- Unit/e2e tests for:
  - Validation failure path
  - Not found path
  - Generic internal error mapping
