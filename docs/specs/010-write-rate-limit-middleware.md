# Spec 010: Rate Limit Middleware for Write Routes

## Goal
Protect mutating endpoints from burst traffic using lightweight in-memory rate limiting.

## Scope
- Add rate-limit middleware for `POST`, `PATCH`, `DELETE` only.
- Apply to:
  - `/v1/products*`
  - `/v1/categories*`
  - `/v1/promotions*`
  - `/v1/orders/:id/cancel`
- Return `429` on limit breach.

## Out of scope
- Distributed/shared rate limit store (Redis).
- Per-user quotas.

## Behavior rules
- Key: IP + method + route pattern.
- Sliding or fixed window accepted; document chosen strategy in code comment.
- Include `Retry-After` header in `429` response.

## Acceptance criteria
- Read-only `GET` endpoints are unaffected.
- Write endpoints enforce limits consistently.
- Error envelope preserved for `429`.

## Verification
- Automated test that sends burst requests and asserts `429`.
- Regression tests for normal request volumes.
