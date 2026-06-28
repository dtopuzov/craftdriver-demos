# Master delivery plan — Jira-style work items

This is the authoritative internal delivery plan. Use it to delegate work to agents and to decide what is ready for review. Product/UX intent lives in `docs/product-ux`; architecture and data constraints live in the other `spec/` documents.

## Status legend

- **Done** — implemented and verified at the appropriate test layer.
- **In progress** — a working slice exists, but acceptance criteria remain.
- **Ready** — fully defined and safe to give to one agent.
- **Blocked** — requires a product decision or a completed dependency.
- **Deferred** — intentionally not scheduled for the current implementation phase.

## How to delegate

Give an agent one work item at a time. Include its ID, expected tests, and linked specification. The agent must not expand scope, skip a specified test layer, or change unrelated working-tree files.

Example:

> Implement **MES-101** from `spec/03-implementation-backlog.md`. Add the required integration tests, update the affected contract/spec documentation, run the mandated checks, and report any product decision that blocks completion.

## Completed foundation

| ID | Work item | Status | Evidence / remaining note |
| --- | --- | --- | --- |
| MES-001 | Workspace and developer baseline | Done | pnpm workspaces, TypeScript, React, Fastify, formatting, linting, Vitest, `.env.example`, README commands. |
| MES-002 | Local runtime and basic CI | Done | Docker Postgres, `pnpm dev`, health endpoint, migrations/seed and core CI checks. |
| MES-003 | Schema, migrations, deterministic fixtures | Done | Users, sessions, exams, revisions, questions, attempts, audit events, migrations, idempotent seed. |
| MES-004 | Authentication and session foundation | Done | Argon2id, opaque cookies, login/logout/me, protected API routes. |
| MES-005 | Shared contracts and grading module | Done | Zod contracts, standard API errors, choice/multiple/numeric grading and unit coverage. |
| MES-006 | Initial student and teacher vertical slice | In progress | Core attempt, authoring, publish/revision, and results paths exist; the following work items finish their acceptance criteria. |

## Release 1 — make the core workflow trustworthy

| ID | Work item | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| MES-101 | Cross-teacher authorization regression suite | Done | MES-003, MES-004 | Second teacher fixture and owner-boundary API tests cover exam, question, publish, unpublish, results, and attempt detail access. |
| MES-102 | Complete attempt authorization and state coverage | Done | MES-101 | Coverage now includes unavailable starts, invalid answer keys, active-start/submit idempotency, expired save rejection, and feedback-policy privacy. |
| MES-103 | Attempt UX reliability pass | Done | MES-102 | Attempt view has review navigation, save/saved/error state, retry, submit protection, and leave-page warning. Browser E2E remains intentionally deferred. |
| MES-104 | Student result and history completion | Done | MES-103 | Student dashboard links completed attempts to a policy-aware result view. Submitted history survives unpublish and remains bound to its original snapshot; score and answer-level feedback are returned only when that published policy permits them. Coverage verifies disclosure, non-disclosure, and immutability. |
| MES-105 | Teacher question editor completion | Done | MES-101 | Draft-only API operations and teacher controls now edit, duplicate, reorder, and delete questions. Validation is aligned on both client and server; the workspace shows publish readiness, save/error state, and guards unsaved form changes or draft switching. Integration coverage proves order integrity, owner isolation, and published-state rejection. |
| MES-106 | Teacher metadata and scheduling readiness | Done | MES-105 | Duration, feedback policy, and optional availability window are editable in the draft workspace; client and server enforce an ordered window. |
| MES-107 | Publish/revision workflow hardening | Done | MES-101, MES-105 | Publish creates immutable numbered snapshots and audit records; unpublish is audited; invalid repeat transitions return explicit state errors; integration coverage verifies the lifecycle. |
| MES-108 | Results portal hardening | Done | MES-101, MES-107 | Owned results show status, timestamps, score, revision, and readable per-question attempt detail; empty/error and owner-isolation paths are covered. |
| MES-109 | UI architecture cleanup | Done | MES-103, MES-105, MES-108 | Web routes are split into route/feature modules; student attempt and teacher authoring/results workflows are importable without routing through the app shell. |
| MES-110 | React component and integration test layer | Done | MES-109 | Vitest + React Testing Library run in jsdom. Auth, student attempt save/result behavior, and teacher route/editor validation are covered with component/MSW integration tests. |

## Release 1 quality gate — intentionally after UX stabilizes

| ID | Work item | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| MES-201 | Accessibility and content pass | Done | MES-103–108 | Added consistent visible focus treatment and 44px control targets; corrected homepage contrast issues and EasyMath metadata; Craftdriver confirmed no Axe violations or JavaScript errors on the homepage and mobile student dashboard. |
| MES-202 | Craftdriver browser suite | Ready | MES-201, MES-110 | Run stable student completion, teacher author/publish/result review, forbidden access, and mobile smoke journeys against real API/Vite/Postgres. Capture artifacts on failure. |
| MES-203 | CI browser gate and artifacts | Blocked | MES-202 | Install Chrome/driver, start services, run `pnpm test:e2e`, upload screenshots/logs on failure. |
| MES-204 | Security and dependency pass | Ready after MES-203 | Authorization regression suite, dependency audit, secret-leak review, rate-limit review, and browser/API security checks. |

## Later product increments

| ID | Work item | Status | Outcome |
| --- | --- | --- | --- |
| MES-301 | Roster, groups, assignments, attempt rules | Deferred | Teachers target revision to students/groups and define availability/attempt limits. |
| MES-302 | Timed exams and result release | Deferred | Server-authoritative time limits, expiry, release policy, and related UX. |
| MES-303 | Rich mathematics authoring | Deferred | Safe LaTeX rendering, preview, and constrained richer question content. |
| MES-304 | Import, reporting, and export | Deferred | CSV/Markdown import, results export, and aggregate reporting. |
| MES-305 | Identity and production operations | Deferred | OAuth, password reset, privacy/retention, monitoring, backups, staging deployment. |

## Current next task

**Start MES-202.** The lower layers are stable enough for the first Craftdriver suite. Keep the browser suite small and focused on seeded student completion, teacher author/publish/result review, forbidden access, and mobile smoke coverage.
