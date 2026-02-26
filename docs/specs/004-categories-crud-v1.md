# Spec 004: Add `/v1/categories` CRUD

## Goal
Introduce category management as a second core domain resource.

## Scope
- Create `CategoriesModule` with CRUD endpoints:
  - `GET /v1/categories`
  - `GET /v1/categories/:id`
  - `POST /v1/categories`
  - `PATCH /v1/categories/:id`
  - `DELETE /v1/categories/:id`
- Category fields:
  - `id`, `name`, `description?`, `isActive`, `createdAt`, `updatedAt`

## Out of scope
- Strict referential integrity with products.
- Nested routes (`/categories/:id/products`).

## Behavior rules
- Category name is required and unique within in-memory dataset.
- `DELETE` returns `204`; missing record returns `404`.

## Acceptance criteria
- Full CRUD works with validation/error envelope.
- Unique-name conflict returns `409` with standard error body.
- Tests added for both happy and conflict paths.

## Verification
- `npm run test`
- Optional targeted e2e for `/v1/categories`
