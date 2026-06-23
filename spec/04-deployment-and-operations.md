# Local PoC operations and later deployment

## PoC operating model: entirely local

The PoC has no public deployment and no paid account. A developer runs PostgreSQL, the REST API and the Vite web application on one machine. Database state is local, reproducible, and disposable.

| Process | Local address | Starts with | Purpose |
| --- | --- | --- | --- |
| PostgreSQL | `localhost:5432` | `docker compose up -d db` | Persistent local data. |
| Fastify API | `http://127.0.0.1:3001` | `pnpm --filter api dev` | Authentication, business logic and database access. |
| Vite web app | `http://127.0.0.1:5173` | `pnpm --filter web dev` | Student/teacher browser application. |

The preferred developer command is `pnpm dev`. It starts the database if needed, verifies the API health endpoint, then runs API and web processes concurrently. `pnpm db:reset` destroys local data, applies migrations and runs the deterministic seed.

## Local configuration

`.env.example` documents only non-secret defaults such as ports and a local `DATABASE_URL`. Each developer has an untracked `.env`. Never commit real passwords, session secrets, exports, production data or browser recordings.

Required local variables:

```text
DATABASE_URL=postgresql://exam:exam@127.0.0.1:5432/exam_poc
API_PORT=3001
WEB_PORT=5173
SESSION_SECRET=replace-with-a-local-random-value
```

## Seed data contract

`pnpm db:seed` must be safe to run repeatedly after `db:reset` and must create deterministic fixtures.

- Two active teacher fixtures and two active students; credentials appear in the local README only. The second teacher exists to prove cross-teacher authorization boundaries.
- A published single-choice/numeric mathematics exam available to students.
- A draft teacher exam for authoring tests.
- One completed attempt/result for the teacher results view.
- Stable emails/titles/question text so E2E tests use semantic selectors and predictable expected values.

Seed credentials are strictly development/CI fixtures, never public accounts.

## Later deployment path

When the PoC needs sharing, retain the same applications and containers:

1. Host the Vite static build on Cloudflare Pages, Vercel, or equivalent.
2. Run the Fastify API as a separate Node service.
3. Move PostgreSQL to a managed provider; run migrations through a reviewed release job.
4. Replace seed users/data with controlled onboarding and production data procedures.

Do not deploy PostgreSQL exposed directly to the internet. The API remains the only database client.

No provider is selected or paid for as part of this PoC. See the earlier cost research only when a deployment decision is actually required.
