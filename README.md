# Mathematics Examination System

A local-first proof of concept for teacher-authored mathematics exams. Students will take
published exams and receive automatically graded results; teachers will author, publish and
review those exams.

The implementation-facing product, UX, screen, and delivery specification is in
[docs/product-ux](docs/product-ux/README.md). It defines the target experience beyond the
current proof-of-concept implementation.

## Requirements

- Node.js 22 LTS or newer
- pnpm 10 (enable it with `corepack enable`)
- A Docker-compatible container runtime (needed from POC-002 onwards)

### macOS: free Colima setup

This project does not require Docker Desktop. Install the free Colima runtime and Docker CLI
once, then start Colima whenever you need local containers:

```bash
brew install colima docker docker-compose

mkdir -p ~/.docker/cli-plugins
ln -sfn "$(brew --prefix)/opt/docker-compose/bin/docker-compose" \
  ~/.docker/cli-plugins/docker-compose

colima start --cpu 2 --memory 4 --disk 30
```

Confirm the Docker connection is available with `docker compose version`. Later, use
`colima stop` to pause the local container VM and `colima start` to resume it; both preserve
the PostgreSQL data volume.

## Start developing

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:up` starts PostgreSQL only at `127.0.0.1:5432`; use it when you want the database
without starting the application. `pnpm dev` also starts PostgreSQL if needed, waits for it to
be ready, then starts the API at `http://127.0.0.1:3001` (`GET /healthz`) and Vite app at
`http://127.0.0.1:5173`. The database remains running when you stop the development servers.

`pnpm db:migrate` applies the versioned PostgreSQL schema. `pnpm db:seed` is safe to run
repeatedly and creates deterministic teacher/student records, one published arithmetic exam,
one draft exam, and a submitted sample attempt. Use `pnpm db:reset` to discard local database
data, recreate the schema, and load the fixtures. API integration tests intentionally create
additional exams and attempts, so run `pnpm db:reset` before a clean manual demo after testing.

Development-only seed credentials (never deploy these) use the password `exam-demo-2026`:

- Teacher: `teacher@example.test`
- Second teacher (authorization-test fixture): `morgan.teacher@example.test`
- Students: `ada.student@example.test`, `noah.student@example.test`

For a concise human-run sanity check of the seeded student and teacher workflows, see the
[manual smoke tests](docs/acceptance/README.md).

If pnpm reports that it ignored the `esbuild` build script or failed to create a `vite-node`
shim after an interrupted/older install, repair the local dependency tree with:

```bash
pnpm install --force
```

`esbuild` is explicitly approved in `pnpm-workspace.yaml`; do not broadly approve dependency
build scripts without reviewing why they are needed.

## Common commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm build
pnpm db:up
pnpm db:down
```

The root workspace contains:

- `apps/web` — Vite, React and TypeScript browser application.
- `apps/api` — Fastify REST API.
- `packages/contracts` — shared Zod DTO schemas and types.
- `packages/grading` — pure server-side grading logic and tests.

Commands for Docker/Postgres, migrations, seeds, REST integration tests and Craftdriver browser
tests are reserved now and become functional in their respective backlog tasks.
