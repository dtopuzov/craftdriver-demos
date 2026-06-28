# Browser E2E tests

This folder contains the Craftdriver browser layer: a deliberately small set of critical journeys against the real web app, API, and database.

Do not place API, React Testing Library, MSW, or manual acceptance tests here.

## Running

Start the app first:

```sh
pnpm dev
```

Then run the suite:

```sh
pnpm test:e2e
```

The Vitest global setup resets, migrates, and seeds the local database once before spec execution. Specs do not reset data, so they can run in parallel. Write-heavy tests create unique users and exams.

Use `E2E_SKIP_DB_RESET=1` only for focused local debugging when the database is already in a suitable state.

Trace capture is not enabled by default. Keep browser setup in specs small unless a flow needs extra diagnostics.

## Structure

- `pages/*` contains page objects. They centralize stable selectors and repeated page actions, but should not hide the business intent of a test.
- `components/*` contains reusable app chrome or page fragments, such as the signed-in shell.
- `data/*` contains seeded account references and factories for unique test data.
- `support/*` contains low-level E2E infrastructure such as routes and global setup.
- `spec/*.spec.ts` files own scenario flow and assertions. Prefer `By.testId`, stable IDs used through `By.css('#id')`, role/label selectors, and direct text assertions on already-located elements.
