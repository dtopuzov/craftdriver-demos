# Delivery requirements and acceptance criteria

## Definition of done for the first usable release

An independent tester can sign in as a seeded student, complete a published maths exam, submit it, and see only permitted feedback. A seeded teacher can create a valid draft, publish a revision, and review the student result. Automated tests prove grading correctness and access-control boundaries.

## Functional acceptance criteria

### Student attempts

- Starting validates role, exam publication, availability, and ownership server-side.
- Start is idempotent for an active attempt; submit is idempotent for a submitted attempt.
- Saves reject another student, unknown question keys, and non-editable attempts.
- Submitting locks the attempt and grades the immutable revision in a transaction.
- Active-attempt payloads exclude correct answers, explanations, and grading configuration.
- Result payload/rendering obeys feedback policy.

### Teacher authoring and publishing

- A teacher can only list, edit, publish, unpublish, or view results for owned exams.
- Draft metadata supports title, instructions, optional duration, feedback policy, and optional availability windows.
- Each question type has client and server validation.
- Publish fails with actionable validation blockers.
- Publish writes an immutable snapshot and a revision number atomically.
- Unpublishing prevents new attempts and never alters old attempts or results.

### Experience quality

- Every route has loading, empty, error, and unauthorized behavior.
- Student answers communicate saving, saved, or recoverable failure.
- Major irreversible actions have confirmation and understandable consequences.
- Current mobile browsers can complete an exam without horizontal scrolling or unreachable controls.

## Test strategy

| Layer | Required proof |
| --- | --- |
| Unit | Choice, multiple-choice, numeric parsing/tolerance, malformed inputs. |
| API integration | Vitest REST tests in `apps/api/tests/integration`: auth, cross-student isolation, cross-teacher isolation, answer-key restrictions, availability, idempotency, revision immutability, publish validation. |
| Component/integration | Vitest + React Testing Library in jsdom: form validation, API error rendering, successful routing, and accessible React interaction without a real browser. |
| Browser — final layer | Craftdriver only: seeded student happy path, teacher author/publish/result path, forbidden access, mobile smoke path. |
| Manual accessibility review | Keyboard, focus, labels, dialogs, live save/errors, responsive attempt flow. |

## Current PoC gap checklist

The following are implementation targets rather than reasons to delay the vertical slice:

- Add a second teacher fixture and cross-teacher authorization tests.
- Complete teacher question edit, reorder, duplicate, and delete controls.
- Add student review page/panel and robust per-answer retry behavior.
- Availability-window authoring is available for draft exams and must retain the server-enforced ordering rule.
- Build Craftdriver browser coverage when the product interaction design has stabilized.
- Update CI to run the browser suite and upload artifacts only after that suite exists.

## Delivery sequence

1. Stabilize the API contracts and authorization regression suite.
2. Finish teacher authoring ergonomics and student review/result UX.
3. Run an accessibility and content pass.
4. Add Craftdriver browser tests for stable, high-value journeys.
5. Gate CI on those browser tests, then evaluate deployment and production-readiness work.

## Change-control rule

When behavior changes, update the relevant contract, API tests, and this UX specification in the same change. Do not introduce a UI control for a policy the server does not enforce.
