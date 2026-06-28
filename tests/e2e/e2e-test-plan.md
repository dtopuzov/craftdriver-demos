# Craftdriver E2E Test Plan

## Purpose

The E2E suite should be a small, high-signal browser layer over the existing unit, API integration, component, and MSW-backed UI integration tests. It should prove that the real Vite app, Fastify API, session cookies, Postgres state, browser navigation, forms, confirmations, autosave, grading, and role routing work together.

It should also act as a polished Craftdriver showcase: semantic locators, auto-waiting assertions, network waits, console error checks, isolated browser contexts where needed, and at least one mobile viewport check.

## Test Layer Boundaries

Keep in E2E:

- Full critical user journeys across the real browser, API, and database.
- Session routing and role-specific navigation through the actual UI.
- Browser-only behavior such as confirmation-gated actions, beforeunload-sensitive flows, autosave on blur/change, responsive layout, and JavaScript console errors.
- One or two cross-role flows where a teacher-visible result depends on a student action.

Keep out of E2E:

- Exhaustive API authorization matrices. Those belong in `apps/api/tests/integration`.
- Question validation edge cases, grading edge cases, and idempotency edge cases. Those are already better covered by API/unit tests.
- Component-level loading, empty, and error permutations. Those belong in React component/UI integration tests with MSW.
- Draft editor CRUD permutations such as duplicate, reorder, and delete, except where needed for one representative teacher journey.

## Proposed Structure

```text
tests/e2e/
  README.md
  e2e-test-plan.md
  vitest.config.ts
  components/
    app-shell.component.ts
  data/
    seeded-users.ts
    student.factory.ts
  pages/
    login.page.ts
    registration.page.ts
    student-attempt.page.ts
    student-dashboard.page.ts
    teacher-dashboard.page.ts
    teacher-exam.page.ts
    teacher-results.page.ts
  support/
    globalSetup.ts
    routes.ts
  spec/
    registration.spec.ts
    student-attempt.spec.ts
    teacher-authoring.spec.ts
    cross-role-results.spec.ts
    smoke.spec.ts
```

`support/globalSetup.ts` should reset the database once per run with `pnpm db:reset`, before Vitest starts spec execution. Spec files must not reset the database themselves, because that breaks parallel execution. For CI, use the same disposable-database setup path, or set `E2E_SKIP_DB_RESET=1` only when an outer pipeline has already reset/migrated/seeded the database.

Spec files should own the small browser lifecycle they need. Prefer a simple `beforeAll`/`afterAll` browser start and stop, with a minimal `beforeEach` for cookies, navigation, and page object construction.

Page objects and components should prefer `By.testId` where the app adds stable test IDs, otherwise `By.role`, `By.labelText`, and exact text. Avoid CSS selectors except for stable IDs, scoped rows, or technical probes.

## Data Strategy

Use deterministic seed accounts:

- Teacher: `teacher@example.test` / `exam-demo-2026`
- Other teacher: `morgan.teacher@example.test` / `exam-demo-2026`
- Student Ada: `ada.student@example.test` / `exam-demo-2026`
- Student Noah: `noah.student@example.test` / `exam-demo-2026`

Recommended reset policy:

- Before the full E2E suite: reset/migrate/seed the database.
- Within tests: create uniquely titled exams using a timestamp or UUID suffix.
- Avoid depending on tests running in a specific order.
- Use a newly registered student for mutable student flows so tests can run independently and in parallel.
- Keep seeded accounts for read-only login/routing checks and teacher setup flows.

Parallel execution rules:

- `db:reset` is global setup only.
- No spec file may truncate, reset, or reseed shared tables.
- Tests that write data must create unique users/exams.
- Browser sessions must be isolated with a fresh Craftdriver context per test.
- Cross-role tests should use two contexts in the same browser, not shared cookies.

## Proposed Scenarios

### 1. Smoke: App Loads Without Browser Errors

Goal: a fast guard that the app starts, the landing page renders, and no JavaScript errors occur.

Flow:

1. Open `/`.
2. Assert the EasyMath landing page heading and Sign in/Create account links are visible.
3. Assert `browser.logs.javaScriptErrors()` is empty.
4. Run an accessibility audit for serious violations if the result is stable enough for CI.

Craftdriver features shown:

- `Browser.launch()`, relying on Craftdriver's default BiDi support
- navigation and auto-waiting assertions
- JavaScript error collection
- optional `browser.a11y.audit({ minImpact: 'serious' })`

### 2. Auth And Role Routing

Goal: prove real session creation, cookie-based `/api/me`, role routing, and logout.

Flow:

1. Sign in as `teacher@example.test`.
2. Assert the Teacher area renders and student-only links are absent.
3. Sign out and assert the login page renders.
4. Sign in as `noah.student@example.test`.
5. Assert My exams renders and teacher-only links are absent.

Craftdriver features shown:

- `By.labelText` for email/password
- `By.role` for buttons and headings
- isolated contexts if running teacher and student sessions in the same spec
- console-error assertion after each role transition

### 3. Student Completes Seeded Exam

Goal: prove the core PoC definition of done in the real browser.

Flow:

1. Register a fresh student.
2. Open My exams and start `Foundations of Arithmetic`.
3. Assert the active attempt shows only presentation data, not correct answers.
4. Select `12` for `What is 7 + 5?`.
5. Enter `12` for `What is the value of 3 x 4?` and blur the field.
6. Assert autosave status reaches `Answer saved.`
7. Open review and assert all questions are answered.
8. Submit, accepting the native confirmation.
9. Assert the dashboard shows `View result`.
10. Open the result and assert score `5 / 5`, question feedback, correct answer text, and explanations.

Craftdriver features shown:

- radio/textbox input via semantic locators
- auto-waiting status assertions
- context init scripts for deterministic confirmation-gated submit flows
- network wait around save/submit responses
- scoped result assertions inside the attempt page

### 4. Teacher Authors And Publishes A New Exam

Goal: prove the teacher can create a valid draft and publish it through the real UI.

Flow:

1. Sign in as Taylor Teacher.
2. Create a uniquely titled draft.
3. Save instructions, duration, and feedback policy.
4. Add one single-choice question with two options, answer, points, and explanation.
5. Assert publish readiness enables `Publish exam`.
6. Publish, accepting the native confirmation.
7. Assert the exam is now `published` and the results route initially shows no attempts.

Craftdriver features shown:

- form filling across inputs, textareas, and select controls
- live readiness assertion
- confirmation-gated publish handling
- URL/route assertions after navigation
- failure trace as a useful demo artifact if the authoring flow regresses

### 5. Cross-Role Results Visibility

Goal: prove a teacher-visible result depends on a real student submission.

Flow:

1. As teacher, create and publish a uniquely titled one-question exam.
2. In an isolated student browser context, register a fresh student.
3. Start the newly published exam, answer it, and submit.
4. Return to the teacher context and open that exam's results.
5. Assert the submitted student appears with the expected score.
6. Open attempt detail and assert the student's answer and graded status are visible to the owning teacher.

Craftdriver features shown:

- multiple isolated browser contexts
- cross-context state through the real database/API
- table row scoping with `filter({ hasText })`
- network idle or response waits between student submit and teacher results refresh

### 6. Mobile Smoke For Student Attempt

Goal: prove the most important learner flow remains usable on a phone viewport.

Flow:

1. Set a mobile-sized viewport, for example `390 x 844`.
2. Sign in as a fresh student account or use a uniquely created exam/student pair.
3. Open an attempt page.
4. Assert headings, answer controls, review button, and submit button are visible and do not require horizontal scrolling.
5. Optionally capture a screenshot artifact for demo documentation.

Craftdriver features shown:

- viewport emulation
- screenshot capture
- layout assertions via page evaluation only where semantic assertions are not enough

## Initial Priority

Implement first:

1. Smoke app load.
2. Auth and role routing.
3. Student completes seeded exam.
4. Teacher authors and publishes a new exam.

Implement next:

5. Cross-role results visibility.
6. Mobile student attempt smoke.

This keeps the first suite useful but not slow. The cross-role test is the best showcase, but it is also the most stateful, so it should come after the smaller journeys are stable.

## Craftdriver Conventions

- Use the library for committed tests: `import { Browser, By } from 'craftdriver'`.
- `Browser.launch()` is enough because Craftdriver enables BiDi by default; pass `enableBiDi: true` only when a test intentionally documents that requirement.
- Use `locator.expect()` assertions instead of custom retry loops.
- Prefer selectors in this order: `By.testId`, `By.role`, `By.labelText`, `By.text({ exact: true })`, then CSS only as a last resort.
- Check `await locator.count()` before acting on uncertain selectors.
- Handle `CraftdriverError` by `ErrorCode`, never by error message text.
- Do not use sleeps. Use locator assertions, `waitForResponse`, or `network.waitForNetworkIdle`.
- Add trace or screenshot artifacts only for flows that need extra diagnostics or demo evidence; keep default spec setup minimal.

## App Changes Worth Considering Before Implementation

The current UI is mostly accessible enough for semantic selectors. A few small testability improvements would make the E2E suite clearer:

- Add stable `data-testid` values only for repeated or ambiguous controls, such as exam cards, results rows, and question articles.
- Add accessible names that include exam titles for repeated buttons, for example `Start Foundations of Arithmetic` or `View result for Foundations of Arithmetic`.
- Add a visible or accessible page landmark for current role/session if that should be asserted consistently.

These are not required to start, but they would make the tests read more like user intent and less like DOM navigation.

## Run Command Proposal

After implementation, replace the deferred root script with a real command:

```json
"test:e2e": "vitest run --config tests/e2e/vitest.config.ts"
```

Local full verification before handoff should be:

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:api
pnpm test:web
pnpm test:e2e
```

For E2E specifically, the expected setup is:

```sh
pnpm db:up
pnpm db:reset
pnpm dev
pnpm test:e2e
```
