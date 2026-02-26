# Spec 016: OpenAPI Annotations for Products + Orders

## Goal
Document stabilized API surface for products and orders.

## Scope
- Add Swagger/OpenAPI setup in bootstrap.
- Annotate controllers/DTOs for:
  - products endpoints
  - orders list/detail/cancel endpoints
- Include examples for common request/response payloads.
- Group by tags and version context (`v1`).

## Out of scope
- Full documentation for every module.
- SDK generation.

## Documentation requirements
- Include error response schema examples aligned with global envelope.
- Show auth requirement on promotions endpoints only if already implemented.
- Mark deprecated request field alias (`sku`) in docs notes.

## Acceptance criteria
- `/docs` (or configured path) serves OpenAPI UI.
- Products and orders routes appear with parameters and schemas.
- Cancel endpoint documented as state transition operation.

## Verification
- Manual check of generated docs UI.
- Optional snapshot test for OpenAPI JSON path stability.
