# Spec 006: Add `/v1/orders` List + Detail

## Goal
Deliver read APIs for orders with filtering and pagination.

## Scope
- Create `OrdersModule` with:
  - `GET /v1/orders`
  - `GET /v1/orders/:id`
- `GET /v1/orders` supports filters:
  - `status`
  - `from` (date)
  - `to` (date)
- Use shared pagination helper from spec 005.

## Out of scope
- Order creation/update workflow.
- Cancellation transition (spec 007).

## Data model (minimum)
- `id`, `status`, `customerId`, `items[]`, `currency`, `totalAmount`, `createdAt`, `updatedAt`

## Behavior rules
- Date filters interpreted as ISO timestamps.
- Invalid date/status filters return `400`.
- Missing order id returns `404`.

## Acceptance criteria
- Orders list supports combined filters + pagination.
- Detail endpoint returns complete order representation.
- Query logic is deterministic and covered by tests.

## Verification
- E2E tests for:
  - filter by status
  - filter by date range
  - pagination metadata correctness
