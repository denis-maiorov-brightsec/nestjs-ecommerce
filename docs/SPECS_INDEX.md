# Specs Index

This backlog is intentionally sequenced to mimic real product work: feature delivery, API contract stabilization, compatibility work, and refactors.

## Status legend
- `Ready`: dependencies are complete; can be assigned.
- `Done`: spec implementation is complete.
- `Blocked`: waiting for dependency specs.

## Backlog
| ID | Spec | Depends On | Status |
|---|---|---|---|
| 001 | API versioning baseline + deprecate unversioned root | - | Done |
| 002 | Global validation pipe + consistent error envelope | 001 | Done |
| 003 | `/v1/products` CRUD | 002 | Done |
| 004 | `/v1/categories` CRUD | 002 | Done |
| 005 | Shared pagination helper + products refactor | 003 | Done |
| 006 | `/v1/orders` list + detail (status/date filters) | 002, 005 | Ready |
| 007 | `/v1/orders/:id/cancel` state transition | 006 | Blocked |
| 008 | `/v1/promotions` CRUD | 002 | Done |
| 009 | Auth guard stub + protect promotions endpoints | 008 | Ready |
| 010 | Write-route rate limiting middleware | 003, 004, 007, 009 | Blocked |
| 011 | Request ID + structured logging interceptor | 002 | Blocked |
| 012 | `/v1/search/products?q=` (reuse Products service) | 003, 005 | Ready |
| 013 | Rename `product.sku` -> `product.stockKeepingUnit` | 003, 012 | Blocked |
| 014 | Refactor Orders into `queries/commands` submodules | 007 | Blocked |
| 015 | Contract tests for products routes | 013 | Blocked |
| 016 | OpenAPI annotations for products/orders | 007, 013 | Blocked |
| 017 | Refactor DTOs into `/dto` folders and update imports | 016 | Blocked |

## Parallelization guidance
- Can run in parallel once deps are satisfied:
  - `004` with `003`
  - `008` with `006`
  - `011` with `006`/`008`
- Must stay after prerequisites:
  - `013` after `012` to force realistic ripple updates
  - `014` after order behavior stabilizes (`006`, `007`)
  - `017` is intentionally last (high-churn refactor)

## API evolution intent
- Introduce `/v1` early and keep deprecation path explicit.
- Add cross-cutting concerns incrementally (validation, errors, request-id, logging, rate-limit, auth).
- Force realistic contract changes (`sku` rename), then harden with tests/docs.
