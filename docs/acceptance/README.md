# Manual acceptance tests

These are short, human-run smoke tests for the Mathematics Examination System PoC. They complement the automated API tests in `apps/api/tests/integration`; they do not replace them.

Run the smoke cases from a clean deterministic database:

```bash
pnpm db:reset
pnpm dev
```

Open `http://127.0.0.1:5173` and follow [the smoke cases](smoke-tests.md) in order. Cases that create an exam or submit an attempt deliberately change local data; run `pnpm db:reset` again before repeating the suite.

## Seeded test users

All accounts use the development-only password `exam-demo-2026`.

| User | Email | Starting state | Primary use |
| --- | --- | --- | --- |
| Taylor Teacher | `teacher@example.test` | Owns the published *Foundations of Arithmetic* exam and a draft *Sets and Factors — Draft* exam. | Teacher authoring and results |
| Morgan Teacher | `morgan.teacher@example.test` | Second teacher with no seeded exam. | Authorization fixture for automated tests |
| Ada Student | `ada.student@example.test` | Has a submitted *Foundations of Arithmetic* attempt with score and answer feedback. | Result/history verification |
| Noah Student | `noah.student@example.test` | Has not started the published arithmetic exam. | Student completion flow |

## What this suite proves

- Sign-in routes each role to the correct workspace.
- A student can start, save, submit, and review a supported exam.
- Feedback follows the published revision’s policy.
- A teacher can author a draft question, publish it, and inspect a submitted attempt.

It intentionally does not test availability scheduling, timed expiry, browser/device coverage, accessibility auditing, exports, or roster workflows; those are outside the current PoC/manual-smoke scope.
