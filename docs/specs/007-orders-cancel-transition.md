# Spec 007: Add `POST /v1/orders/:id/cancel` State Transition

## Goal
Add a command-style endpoint that performs controlled order state transition.

## Scope
- Add endpoint: `POST /v1/orders/:id/cancel`.
- Implement transition rules in service layer (not controller).
- Persist transition metadata (`updatedAt`, optional `cancelledAt`, optional reason field if provided).

## Out of scope
- Refund processing.
- External payment integrations.

## Transition rules
- Allowed: `pending -> cancelled`, `paid -> cancelled`.
- Forbidden: `shipped -> cancelled` (return `409`).
- Idempotent cancel on already cancelled order returns `200` with unchanged resource.

## Acceptance criteria
- Endpoint exists and enforces transition rules.
- Errors follow global envelope with meaningful conflict code.
- Existing list/detail endpoints reflect updated status after cancellation.

## Verification
- Tests for:
  - valid cancel from `pending`
  - forbidden cancel from `shipped`
  - idempotent behavior on already `cancelled`
