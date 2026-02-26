# Spec 017: Move DTOs into `/dto` Folders + Update Imports

## Goal
Perform a late-stage structural cleanup after API contracts stabilize.

## Scope
- For each module (`products`, `categories`, `orders`, `promotions`, shared query DTOs):
  - move DTO classes into module-local `dto/` folders
  - update imports/exports across codebase
- Keep runtime behavior unchanged.

## Out of scope
- DTO redesign or field-level contract changes.
- Additional endpoint behavior work.

## Refactor constraints
- No endpoint path, payload, or status code changes.
- Keep naming consistent and discoverable (`create-*.dto.ts`, `update-*.dto.ts`, etc).
- Avoid circular dependencies introduced by barrel files.

## Acceptance criteria
- Build passes with new folder layout.
- All tests continue to pass without contract changes.
- Directory structure is consistent across modules.

## Verification
- `npm run build`
- `npm run test`
- `npm run test:e2e`
