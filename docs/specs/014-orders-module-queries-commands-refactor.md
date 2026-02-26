# Spec 014: Extract Orders Module into Queries/Commands Submodules

## Goal
Refactor orders internals for maintainability while preserving external API behavior.

## Scope
- Split orders implementation into submodules:
  - `orders/queries` for list/detail read paths
  - `orders/commands` for cancel transition
- Move services/handlers accordingly.
- Keep existing routes and payload contracts unchanged.

## Out of scope
- Full CQRS library adoption.
- Route/path changes.

## Refactor constraints
- No behavioral drift.
- Preserve validation, error mapping, and status codes.
- Keep module boundaries explicit and testable.

## Acceptance criteria
- Orders endpoints continue to pass prior tests unchanged.
- Code structure reflects query/command separation.
- No imports remain from old flattened orders service structure.

## Verification
- Run existing orders tests before/after refactor.
- Add at least one focused test proving cancel path still integrates with read side.
