# Mathematics Examination System — PoC specification

## Purpose

This folder defines a small but real learning/examination product that can be built in independently delegated tasks. The first release lets local-account students take authored mathematics exams and see their results; teachers author and publish exams, then review attempts.

## Recommended zero-cost PoC stack

| Area | Choice | Why |
| --- | --- | --- |
| Web app | Vite, React, TypeScript | Fast development, a small client, and an independent frontend deployable later. |
| UI/data | React Router, TanStack Query, React Hook Form + Zod | Clear routing, REST server-state cache, validated forms. |
| REST API | Fastify, TypeScript, Zod | Explicit business-logic boundary and typed, validated HTTP contracts. |
| Database | PostgreSQL in Docker Compose | A real relational database with no external account or cost for the PoC. |
| Database access | Drizzle ORM + SQL migrations | Type-safe data access and versioned schema; the API is the only database client. |
| Authentication | API-managed local accounts: Argon2id + secure cookie session | Local users now, with no third-party dependency; add Google OAuth behind the same API later. |
| E2E browser tests | `craftdriver` | Required real-Chrome tests of the running Vite app and REST API. |
| Automated checks | GitHub Actions on `ubuntu-latest` | Start temporary Postgres, API and Vite application, then run Craftdriver tests. |

The browser communicates only with the REST API; it never has database credentials. The API owns authorization, grading, publishing revisions and all writes. This removes an entire class of client-side answer-key exposure mistakes.

## Documents

- [01-product-scope.md](01-product-scope.md) — users, journeys, acceptance criteria and exclusions.
- [02-technical-design.md](02-technical-design.md) — architecture, schema, API, security and quality constraints.
- [03-implementation-backlog.md](03-implementation-backlog.md) — current Jira-style master delivery plan and agent-delegable work items.
- [04-deployment-and-operations.md](04-deployment-and-operations.md) — the local-only PoC environment and later deployment choices.
- [05-local-development-and-ci.md](05-local-development-and-ci.md) — exact local process model and the required GitHub Actions/Craftdriver test contract.
- [06-quality-and-documentation-policy.md](06-quality-and-documentation-policy.md) — when to add unit/API/component/E2E tests and when to update internal or public documentation.

## Key decisions (deliberately made now)

1. **Local email/password accounts first.** The API owns password hashing and sessions. Google OAuth is a later identity adapter, not a different user model.
2. **Teacher-created multiple-choice and numeric-answer questions first.** Exact numeric matching (with a configurable tolerance) makes automatic grading reliable. Free-text algebra equivalence is explicitly deferred.
3. **Answers and correct solutions never reach the client before submission.** The REST API grades an attempt.
4. **A student submits an immutable attempt.** A revision/published-exam snapshot protects historical results from subsequent teacher edits.
5. **Teacher-led enrolment is out of scope for the narrowest PoC.** Students can see published exams initially; groups/assignments are a planned extension.
6. **PoC data is deterministic.** Migrations and seed data create demo teacher/student accounts, two exams, and example outcomes in every fresh local/CI database.

## Open product decisions before production

- Is the product for minors/schools, and which countries apply? This determines consent, retention, data-processing and accessibility requirements.
- Does an exam need a time limit, availability window, one attempt only, or teacher-specific student groups?
- Is a result visible immediately, only after a release date, or after teacher review?
- Will numerical answers accept locale commas, units, fractions, or only decimal numbers?

These are not blockers for the PoC; the defaults in the other specifications are suitable until the product owner changes them.
