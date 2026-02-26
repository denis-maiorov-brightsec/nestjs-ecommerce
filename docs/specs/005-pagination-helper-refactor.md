# Spec 005: Shared Pagination Helper + Products Refactor

## Goal
Remove ad-hoc list response handling and introduce shared pagination utilities.

## Scope
- Add reusable pagination query parser/helper in shared layer.
- Standardize list response envelope:
  - `data`
  - `meta` (`page`, `limit`, `total`, `hasNext`)
- Refactor `GET /v1/products` to use the shared helper.

## Out of scope
- Orders integration (comes in spec 006).
- Cursor-based pagination.

## Behavior rules
- Defaults: `page=1`, `limit=20`.
- Hard cap limit (for example `100`) to prevent abuse.
- Invalid pagination params return `400`.

## Acceptance criteria
- Products list response shape is standardized with `meta`.
- No behavior regressions in non-list products endpoints.
- Shared helper is reusable by future modules (orders/search).

## Verification
- Tests for helper edge cases (`page<=0`, `limit>max`, non-numeric input).
- Regression tests for products list endpoint.
