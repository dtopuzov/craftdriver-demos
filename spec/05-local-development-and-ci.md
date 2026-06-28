# Local development and GitHub Actions CI

## Development contract

The complete system must work from a fresh clone with Docker and the supported Node LTS runtime installed:

```bash
pnpm install --frozen-lockfile
pnpm dev
# Browse to http://127.0.0.1:5173
```

The browser application requests `/api/...`; Vite proxies this prefix to `http://127.0.0.1:3001`. This keeps local browser use and E2E tests same-origin. The API's health check is `GET /healthz`; Vite's page is ready only after the API has passed its health check.

## Required package scripts

| Script | Meaning |
| --- | --- |
| `pnpm dev` | Start DB/API/web for an interactive local session. |
| `pnpm db:up` | Start PostgreSQL only. |
| `pnpm db:migrate` | Apply migrations to the configured database. |
| `pnpm db:seed` | Load deterministic development/CI fixtures. |
| `pnpm db:reset` | Reset the local development database, migrate, then seed. |
| `pnpm lint` / `pnpm typecheck` / `pnpm test:unit` | Fast correctness checks. |
| `pnpm test:api` | Start against test DB and run REST/integration tests. |
| `pnpm test:e2e` | Run Craftdriver Chrome tests against running API and Vite app. |
| `pnpm build` | Build API and Vite production artifacts. |

## Craftdriver requirements

Craftdriver is the required browser-test library, not Playwright or Cypress. It drives a real WebDriver-compatible Chrome browser and provides automatic waits and assertions. [Craftdriver repository](https://github.com/dtopuzov/craftdriver)

Tests live in `tests/e2e` and must:

- use accessible role/name selectors or stable `data-testid` values—not CSS layout selectors;
- launch Chrome headlessly in CI and allow headed local debugging;
- create a browser/session in test setup and always call `browser.quit()` in teardown;
- preserve screenshots and browser console/error logs when a test fails;
- use the seed accounts rather than sharing test state between scenarios;
- test the real REST API; network mocking is allowed only for a clearly isolated UI case.

Minimum scenarios:

1. Student signs in, starts the seeded exam, saves an answer, submits, and sees the expected result.
2. Teacher signs in, creates a draft question, publishes the exam, and sees a student result.
3. A student is forbidden from reading teacher results or another student attempt.
4. Student exam experience has a mobile-emulation smoke test.

## CI pipeline

The workflow runs on `push` and `pull_request` using `ubuntu-latest`. Public repositories may use standard GitHub-hosted runners without Actions-minute charges; runners are ephemeral, so every job must create all required state. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

GitHub Actions supports PostgreSQL and Redis service containers on Ubuntu runners. The initial workflow needs only PostgreSQL. [PostgreSQL service containers](https://docs.github.com/actions/using-containerized-services/creating-postgresql-service-containers)

Required job sequence:

1. Check out the immutable commit and install the pinned Node LTS runtime.
2. Restore package-manager cache; run `pnpm install --frozen-lockfile`.
3. Start a PostgreSQL service container with a health check.
4. Run migrations and deterministic seed against the CI database.
5. Run lint, typecheck, grading unit tests and REST integration tests.
6. Install a Chrome binary and a compatible ChromeDriver/WebDriver capability required by the selected Craftdriver version; pin/document this setup in the workflow.
7. Start Fastify on `127.0.0.1:3001` and Vite on `127.0.0.1:5173` in the background.
8. Poll `/healthz` and the Vite URL with a bounded timeout; print server logs if either fails.
9. Run `pnpm test:e2e` with `CI=true`, against `http://127.0.0.1:5173`.
10. Always upload server logs and Craftdriver screenshots/browser logs as artifacts on failure. Keep retention short to stay within GitHub storage limits.

The CI run is a test environment, not a host: the virtual machine and its database are discarded at job completion. It must not be treated as an application deployment.

## CI acceptance criterion

From a fresh GitHub `ubuntu-latest` runner, the workflow starts Postgres, migrates/seeds the database, starts the API and Vite server, launches Chrome via Craftdriver, completes the student journey, then exits successfully without using any cloud service or secret.
