# E-commerce Backoffice API Agent Guide

## Objective
This repository is used to simulate iterative product development for a NestJS backoffice API.  
Agents must implement work from `docs/specs/` one spec at a time, in dependency order, with realistic churn (new routes, contract changes, refactors, deprecations).

## Source of truth
- Backlog order and dependencies: `docs/SPECS_INDEX.md`
- Single-task implementation details: `docs/specs/*.md`

## Execution protocol for every agent run
1. Pick exactly one spec that is `Ready`.
2. Read the entire spec and its dependency list.
3. Implement only that spec's scope.
4. Run relevant tests and lint for touched areas.
5. Update docs/tests required by the spec.
6. Stop after completion criteria are met.

## Non-negotiable guardrails
- Do not pull in future-spec behavior unless explicitly required by backward compatibility in the current spec.
- Preserve existing API behavior unless current spec says to change it.
- Prefer small, reviewable changes with clear commit boundaries.
- If blocked by missing prerequisites, stop and mark the spec as blocked with a concrete reason.

## Definition of done (per spec)
- All acceptance criteria from the target spec pass.
- Required tests were added/updated and pass locally.
- No unrelated refactors.
- Routes/DTO/auth/middleware/versioning behavior matches the spec exactly.
- Any deprecations are documented in code comments or docs when required.

## Branch and commit guidance
- Branch naming: `spec/<id>-<short-name>`
- Commit style:
  - `feat(spec-00x): ...` for behavior changes
  - `refactor(spec-00x): ...` for structural changes
  - `test(spec-00x): ...` for test-only work
  - `docs(spec-00x): ...` for docs-only follow-up

## Expected output from an implementation agent
- What changed (files + behavior)
- Acceptance criteria checklist
- Test command(s) executed and results
- Any follow-up risks or migration notes
