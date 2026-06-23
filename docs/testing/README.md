# Test architecture

This repository demonstrates a deliberately layered test strategy. A test belongs in the lowest layer that can prove the behaviour with confidence.

| Layer | Location | Tooling | Proves |
| --- | --- | --- | --- |
| Unit | `packages/*/src/**/*.test.ts` | Vitest | Pure domain logic and edge cases. |
| REST API integration | `apps/api/tests/integration` | Vitest + Fastify injection + local Postgres | Contracts, persistence, authorization, and state transitions. |
| React component | `apps/web/tests/component/<feature>` | Vitest + React Testing Library + jsdom | Accessible interaction, local validation, loading, and component callbacks. |
| React UI integration | `apps/web/tests/integration/<feature>` | Vitest + React Testing Library + MSW | A feature's UI and REST boundary, including realistic response/error states, without a real browser. |
| Browser E2E | `tests/e2e` (future) | Craftdriver | A small set of critical user journeys against the running system. |

## Rules

- Prefer user-facing accessible queries (`getByRole`, `getByLabelText`) over CSS selectors in React Testing Library.
- Component tests receive explicit callbacks or dependencies. Do not mock React internals.
- UI integration tests use MSW; API integration tests use the real API/database stack. Never replace API authorization tests with browser or MSW tests.
- The shared `renderWithProviders` helper supplies only application-level providers. Add providers there rather than duplicating setup in individual tests.
- Keep E2E intentionally small. It confirms integration between layers; it is not the place to exhaust every validation branch.

Run the web component and integration suites with `pnpm --filter web test`.
