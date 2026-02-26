# Spec 008: Add `/v1/promotions` CRUD

## Goal
Introduce promotions management with two discount types.

## Scope
- Create `PromotionsModule` endpoints:
  - `GET /v1/promotions`
  - `GET /v1/promotions/:id`
  - `POST /v1/promotions`
  - `PATCH /v1/promotions/:id`
  - `DELETE /v1/promotions/:id`
- Promotion types:
  - `percentage`
  - `fixed`

## Data contract (minimum)
- `id`, `name`, `type`, `value`, `isActive`, `startsAt?`, `endsAt?`, `createdAt`, `updatedAt`

## Out of scope
- Promotion-to-product mapping logic.
- Auth (next spec).

## Behavior rules
- `percentage` value must be within valid range (for example `1-100`).
- `fixed` value must be positive.
- Invalid type/value combinations return `400`.

## Acceptance criteria
- Full CRUD works and validates type-specific fields.
- Error envelope remains consistent.
- Tests include both promotion types and invalid payload cases.

## Verification
- `npm run test`
- e2e checks for create/update with both types
