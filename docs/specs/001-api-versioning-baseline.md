# Spec 001: API Versioning Baseline + Unversioned Deprecation

## Goal
Introduce URI versioning so all new APIs live under `/v1`, while keeping a clearly deprecated unversioned root route for transition.

## Scope
- Enable Nest URI versioning in bootstrap.
- Add a versioned health route: `GET /v1/health`.
- Keep unversioned `GET /` temporarily, but mark it deprecated in behavior (message + deprecation header).
- Update existing tests that currently expect `"Hello World!"`.

## Out of scope
- Business modules (products/orders/etc).
- Swagger docs.

## Implementation notes
- `main.ts`: configure versioning (`VersioningType.URI`).
- Introduce a minimal health controller/service or update existing app controller.
- Deprecation signal should be machine-readable:
  - `Deprecation: true`
  - Optional `Sunset` header with a placeholder date.

## Acceptance criteria
- `GET /v1/health` returns `200` with JSON payload (`status: "ok"`).
- `GET /` still returns `200`, but includes deprecation header and migration message.
- No routes outside `/v1` are introduced except deprecated root fallback.
- E2E test suite updated to match new behavior.

## Verification
- `npm run test:e2e`
- Manual curl:
  - `/v1/health`
  - `/`
