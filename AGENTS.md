# Repository workflow

- Use `pnpm` for dependency and workspace commands.
- Before handoff, run `pnpm lint`, `pnpm typecheck`, and the tests relevant to the change.
- After every significant user-visible feature or fix, use Craftdriver to open `http://127.0.0.1:5173/` and verify that the page loads without browser JavaScript errors. If the change affects another user-visible route, verify that route and its primary flow too.
- When a workspace package changes its public exports, run that package's `pnpm --filter <package> build` before browser verification so Vite does not load stale package output from `dist/`.
- API integration tests require a running, migrated, seeded database: `pnpm db:up`, `pnpm db:migrate`, then `pnpm db:seed`.
- Preserve unrelated working-tree changes. Do not reset, discard, or rewrite them.
- Treat seed accounts and database URLs as local-development fixtures; never expose them outside the development environment.

# Agent workflows

- Use the `craftdriver` skill for real-browser testing, browser automation, mobile-emulation checks, screenshots, or Craftdriver CLI/MCP work.
- The skill owns Craftdriver selector choice, auto-waiting, stable error-code handling, and when to use its library, CLI, or MCP server.
- Keep API integration tests in Vitest. Use Craftdriver only for user-visible browser flows against the running app.
- Keep test layers separate: REST API integration tests live in `apps/api/tests/integration`; React component tests live in `apps/web/tests/component`; MSW-backed React UI integration tests live in `apps/web/tests/integration`; real-browser E2E tests use Craftdriver in `tests/e2e` and are added only after the API and component layers are stable. Follow `docs/testing/README.md` for the layer boundaries and selector/mock rules.

# Tooling

- Craftdriver is installed as a root development dependency. Use the local package through `pnpm exec craftdriver`.
- Project MCP configuration is available for Codex and Copilot. It starts Craftdriver only when an MCP-capable host enables and invokes it.
