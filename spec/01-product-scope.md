# Product scope and behaviour

## Roles

| Role | May do |
| --- | --- |
| Student | Register a learner account, sign in, view available exams, start one, answer questions, save progress, submit, and view their own result/history. |
| Teacher | Sign in, create/edit draft exams, create questions, publish/unpublish exams, and view results for exams they own. |
| Administrator | PoC: seeded first teacher only. Later: manage teacher accounts and school-wide settings. |

A user has one primary role in the PoC. The schema must allow adding memberships/roles later.

## Student journey

1. Student signs in with email and password.
2. The dashboard lists published exams, status (`not started`, `in progress`, `submitted`) and score if released.
3. Student opens an eligible exam and explicitly starts an attempt. The system records a snapshot of questions and grading rules.
4. Student navigates questions, changes answers, and sees save status. Answers save automatically.
5. Student reviews unanswered questions, submits after a confirmation, and cannot change the submitted attempt.
6. Server grades automatic questions and shows total score, question feedback, and correct answers only when the exam feedback policy permits it.

## Teacher journey

1. Teacher signs in and sees exams they own.
2. Teacher creates a draft with title, instructions, optional duration, score pass mark, and feedback policy.
3. Teacher adds questions, options/answers, points and explanation. At least these types are supported:
   - `single_choice`: one correct option;
   - `multiple_choice`: one or more correct options;
   - `numeric`: number with optional absolute tolerance.
4. Validation prevents publishing an invalid exam (no questions, no valid answer, negative points, invalid window).
5. Teacher publishes/unpublishes the exam. Publishing creates an immutable revision for new attempts.
6. Teacher opens an exam results table and an individual attempt. They see student, status, timestamps, score, and per-question answers.

## PoC functional requirements

- Responsive desktop-first web app, usable on recent phone browsers.
- Public registration creates student accounts only. The seed also creates development-only teacher and student fixtures; teacher registration/invites are later work.
- Password reset exists before any external demo with real users.
- A student cannot see another student's profile, attempts, answers, or scores.
- A teacher cannot modify or view exams/results owned by another teacher.
- An exam may be published only with valid auto-gradable questions.
- Submission is idempotent: a duplicate click/request cannot create two attempts or double-count a score.
- UI handles loading, empty, error and unauthorized states.

## Out of scope for PoC

- Google sign-in, SSO, payments, notifications, collaboration and live proctoring.
- File uploads, diagrams, rich equation editing, handwritten answers and AI grading.
- Random question generation, question banks, adaptive learning, certificates and gradebook exports.
- Algebraic symbolic equivalence. Numeric input only; use choices where a non-numeric answer is needed.
- Importing exams. Build authoring with an internal question JSON shape first; CSV/Markdown import follows once actual source examples are available.

## Definition of done for the PoC

An independent tester can sign in as a supplied student, complete a published maths exam, submit it, and see a correctly calculated result. The supplied teacher can author and publish another exam and see the student's result. Automated tests cover the grading rules and access-control policies.

The supplied seed accounts are development-only fixtures. They must never become production credentials.
