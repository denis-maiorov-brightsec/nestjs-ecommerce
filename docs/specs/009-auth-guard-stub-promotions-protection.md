# Spec 009: Auth Guard Stub + Protect Promotions Endpoints

## Goal
Add minimal auth shape and enforce it on promotions routes only.

## Scope
- Introduce an auth guard stub (header-based).
- Protect all `/v1/promotions` endpoints with this guard.
- Keep all non-promotions endpoints publicly accessible for now.

## Auth behavior
- Expect header `x-admin-token`.
- Compare with config/env value (default allowed in local dev).
- Missing/invalid token -> `401`.

## Out of scope
- Real JWT/session auth.
- Role/permission matrix.

## Acceptance criteria
- Promotions endpoints require auth; other endpoints do not.
- Unauthorized responses use standard error envelope.
- Guard is reusable for future endpoint protection.

## Verification
- Tests:
  - `401` without token
  - success with valid token
  - regression: `/v1/products` remains unprotected
