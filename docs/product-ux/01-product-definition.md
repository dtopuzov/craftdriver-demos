# Product definition

## Product statement

Mathematics Examination System is a teacher-operated assessment tool for creating short, auto-gradable maths exams and giving students a calm, reliable way to complete them. It is designed for small classroom workflows before it becomes a broader learning-management system.

The first release must let a supplied teacher create and publish an exam, let a supplied student complete it on desktop or phone, and let the teacher review the resulting attempt. Security, ownership, and answer-key protection are product requirements—not implementation details.

## Users and jobs

| User | Job to be done | Success signal |
| --- | --- | --- |
| Student | “Tell me what I need to do, preserve my answers, and show me my permitted result.” | Starts confidently, never loses a saved answer, submits once, understands the outcome. |
| Teacher | “Create a valid exam without needing technical knowledge, then see who has completed it and how they did.” | Publishes only valid exams and can act on a legible results list. |
| Administrator | “Keep the demonstration safe and usable.” | PoC uses only seeded accounts; future administration is deliberately deferred. |

## Release scope

### Must have

- Email/password sign-in plus public learner registration. Public registration creates student accounts only.
- Student dashboard, attempt, review/submit, and result/history views.
- Single-choice, multiple-choice, and numeric questions with automatic grading.
- Explicit draft → publish → immutable revision workflow.
- Teacher draft editor and owned-exam results/attempt detail.
- Server-authoritative access control, scores, and availability windows.
- Responsive and accessible basic interaction patterns.

### Explicitly not in this release

- Password reset for real users, Google/SSO, teacher self-registration, roster management, groups, assignments, uploads, rich equation editing, question banks, partial credit, manual marking, notifications, exports, or production hosting.
- Timed forced submission, availability scheduling UI, and result-release scheduling are next-release capabilities. The data model may support them, but the UI must not pretend they are complete.

## Product principles

1. **Assessment integrity first.** Never leak grading data, trust client score calculations, or allow an old attempt to mutate with a draft.
2. **Confidence through visible state.** Show save state, attempt state, feedback policy, publish readiness, and irreversible actions before they happen.
3. **One obvious next action.** Every major screen has a primary action: start, continue, review, submit, save, publish, or view results.
4. **Progressive complexity.** Students see an exam, not an authoring system. Teachers see the next validation problem, not raw database structure.
5. **Accessible by default.** Semantic controls, visible keyboard focus, associated labels, announced save/errors, and touch-friendly actions are baseline behavior.

## Feature map

| Area | Core feature | Notes |
| --- | --- | --- |
| Identity | Learner registration, sign in/out, session restoration, role-aware routing | Anonymous users can register or sign in; public registration never grants teacher access. |
| Student home | Available, active, and submitted exam cards | Never show an unavailable or unauthorized exam. |
| Attempt | Questions, autosave, progress, review, submit | Answer values remain editable until submitted only. |
| Result | Score, question feedback, correct answers/explanations when allowed | Rendering follows the revision feedback policy. |
| Teacher home | Owned-exam list and create-draft action | Include draft/published status and result count. |
| Authoring | Metadata, questions, validation, unsaved-change guard | Draft-only editing. |
| Publishing | Readiness checklist, confirmation, immutable revision | Explain what publishing changes. |
| Results | Aggregate list and attempt detail | Strict owner checks, no cross-teacher access. |
| System quality | Loading, empty, error, unauthorized, destructive-action states | These are part of every flow. |
