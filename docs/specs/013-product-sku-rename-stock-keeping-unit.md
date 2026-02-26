# Spec 013: Rename `product.sku` -> `product.stockKeepingUnit`

## Goal
Simulate a real API contract evolution with backward-compatible transition.

## Scope
- Rename product domain field and DTO property from `sku` to `stockKeepingUnit`.
- Update create/patch/list/detail/search logic to use new canonical field.
- Keep temporary backward compatibility for requests that still send `sku`.

## Compatibility policy
- Requests:
  - Accept both `stockKeepingUnit` and deprecated `sku`.
  - If both are sent and values conflict -> `400`.
- Responses:
  - Return only `stockKeepingUnit` (canonical).
- Deprecation communication:
  - Add warning note in docs/comments for `sku` sunset.

## Out of scope
- Immediate hard removal of `sku` input alias.

## Acceptance criteria
- All products endpoints function with canonical field.
- Legacy clients sending only `sku` still succeed during transition.
- Search endpoint still works and matches canonical field values.
- Tests updated to cover alias path + conflict path.

## Verification
- Contract tests updated (or added) for request alias handling.
- Regression on create/read/update/search.
