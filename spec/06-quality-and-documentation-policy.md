# Quality, testing, and documentation policy

This policy applies to every Jira-style work item in `03-implementation-backlog.md`.

## Test timing

### Write unit tests immediately when

- Adding or changing pure grading, parsing, formatting, validation, date/window calculation, or permission helper logic.
- Fixing a bug that can be expressed without HTTP, browser, database, or clock infrastructure.
- Adding a new Zod schema rule or a non-trivial conversion between UI/API values.

Unit tests are small, fast, deterministic, and run on every change. They are not a substitute for authorization or transaction tests.

### Write API integration tests in the same work item when

- Adding, changing, or removing any REST endpoint.
- Changing authentication, role checks, resource ownership, feedback policy, publication, availability, attempt state, or transaction behavior.
- Fixing any defect that could expose another user’s data, alter grades, or create duplicate state.
- Changing a database migration or a seed fixture used by API behavior.

Integration tests use PostgreSQL and real Fastify injection. They must assert status code, safe response shape, and durable state where that matters. Repeated runs must not depend on the order of prior test runs.

### Write component tests when

- A component has meaningful local state or validation that cannot be demonstrated cheaply by an API test.
- A regression concerns keyboard behavior, a dialog, conditional question form behavior, loading/error rendering, or a state transition within one screen.

Component tests are useful but not mandatory for every presentational component. They should follow a stable feature boundary, not a temporary monolithic page structure.

### Write Craftdriver E2E tests only when

- The user journey, page structure, accessible names, and key interactions are stable enough that the test will not be rewritten by the next UX task.
- The flow crosses the browser/API/database boundary or depends on responsive browser behavior.
- A scenario is high-value: sign-in, submit, publish, ownership denial, or mobile attempt completion.

The current product decision defers E2E work. Do not add brittle browser tests prematurely. When MES-202 starts, use Craftdriver with semantic selectors/test IDs, no arbitrary sleeps, and failure screenshots/logs.

## Required checks by change type

| Change | Minimum evidence before review |
| --- | --- |
| Pure domain logic | Unit test, lint, typecheck. |
| Endpoint / authorization / DB behavior | API integration test, lint, typecheck. |
| Shared contract | Schema/type checks plus all affected API tests. |
| UI behavior | Typecheck, lint, focused component/manual verification; API tests if a contract changed. |
| Stable end-to-end journey | Craftdriver test once E2E phase is active. |
| CI/tooling | Run the changed command locally; validate workflow syntax and document prerequisites. |

## Documentation lifecycle

### `spec/` — internal source of truth

Update `spec/` in the same change when product scope, behavior, data model, API contract, security rule, delivery plan, test policy, or operations procedure changes. This includes changes that are not yet public.

### `docs/product-ux/` — developer design handoff

Update product/UX docs when a screen, flow, interaction, state, copy rule, accessibility requirement, or visual direction changes. Update a visual reference only when the design direction materially changes; do not generate a new image for minor layout tweaks.

### Root `README.md` — developer onboarding

Update the README when install/run/test/build commands, required tools, seed credentials, or the primary project entry points change. Keep it concise and link to deeper documents rather than duplicating them.

### Public/user documentation — write only when stable

Create public documentation under `docs/user/` only when a feature is usable by a real user and its behavior is stable enough to support. Typical trigger points:

| Trigger | Public documentation to add/update |
| --- | --- |
| First external demo | Student sign-in and exam-completion guide; teacher author/publish guide; demo-account handling. |
| Scheduling/attempt rules released | Availability, duration, retake, and result-release explanation. |
| Data/privacy production decision | Privacy notice, data retention, support/contact, export/deletion process. |
| Deployment/staging released | Administrator/deployer runbook and release notes. |

Do not publish PoC seed credentials, internal URLs, security implementation detail, or unstable mockups as user instructions.

## Definition of documentation done

- The right source is updated, with no conflicting duplicate guidance.
- Commands have been run or are explicitly marked as future/planned.
- Links resolve within the repository.
- The Jira work item includes its test evidence and documents any intentional deferral.
