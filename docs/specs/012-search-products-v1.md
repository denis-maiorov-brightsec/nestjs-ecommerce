# Spec 012: Add `GET /v1/search/products?q=`

## Goal
Provide a dedicated product search route while reusing existing products domain logic.

## Scope
- Add endpoint: `GET /v1/search/products?q=<term>`.
- Reuse products service/repository (no duplicated data access layer).
- Support optional pagination params via shared helper.

## Out of scope
- Full-text engine integration.
- Cross-entity search.

## Behavior rules
- `q` is required; min length `2`.
- Case-insensitive matching against product `name` and `sku`.
- Response shape follows standardized list envelope (`data` + `meta`).

## Acceptance criteria
- Search endpoint returns filtered products from existing dataset.
- Validation errors (`missing q`, too short) return `400`.
- Products module remains the single source of truth for product querying.

## Verification
- Tests for partial/case-insensitive matches.
- Tests that ensure pagination metadata is returned for search results.
