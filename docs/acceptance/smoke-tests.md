# PoC manual smoke tests

## Preconditions

1. Run `pnpm db:reset`.
2. Run `pnpm dev` and wait for the API at `http://127.0.0.1:3001` and web app at `http://127.0.0.1:5173`.
3. Use a normal desktop browser. Start each independent test from the sign-in screen unless it explicitly depends on an earlier case.

Record Pass, Fail, or Blocked beside each case. If a case changes fixture data, reset the database before rerunning it.

## SMK-001 — Role-aware sign-in

**Purpose:** confirm seeded users can authenticate and are sent to the right workspace.

1. Open `http://127.0.0.1:5173`.
2. Sign in as `noah.student@example.test` with password `exam-demo-2026`.
3. Confirm the page identifies Noah as a student and shows **My exams**.
4. Sign out.
5. Sign in as `teacher@example.test` with the same password.
6. Confirm the page identifies Taylor as a teacher and shows **Teacher area** and **Your exams**.

**Expected:** both sign-ins succeed; no user sees the other role’s home screen.

## SMK-002 — Student starts, saves, submits, and reviews an exam

**Purpose:** verify the core student assessment journey.

1. Reset the database, then sign in as `noah.student@example.test`.
2. On **Foundations of Arithmetic**, select **Start exam**.
3. Confirm the attempt shows the title, revision, instructions, two questions, and a save-state message.
4. Choose `12` for *What is 7 + 5?*.
5. Enter `12` for *What is the value of 3 × 4?*, then move focus away from the field.
6. Confirm **Answer saved.** appears after each saved change.
7. Select **Submit attempt** and accept the confirmation.
8. On **My exams**, select **View result**.

**Expected:** the attempt submits once, the dashboard shows **View result**, and the result shows score `5 / 5`, question feedback, correct answers, and explanations.

## SMK-003 — Existing student result/history is revision-based

**Purpose:** verify a seeded completed attempt remains readable and shows only permitted feedback.

1. Reset the database, then sign in as `ada.student@example.test`.
2. On **Foundations of Arithmetic**, select **View result**.
3. Confirm the result identifies *Foundations of Arithmetic*, revision `1`, and score `2 / 5`.
4. Confirm question feedback includes Ada’s answers, correctness, correct answers, and explanations.
5. Select **Back to my exams**.

**Expected:** the submitted attempt is read-only and its result is available from the dashboard. No answer-edit controls are shown.

## SMK-004 — Teacher creates and publishes a valid exam

**Purpose:** verify the minimum teacher authoring workflow.

1. Reset the database, then sign in as `teacher@example.test`.
2. Enter `Smoke numeric exam` as **New draft title** and select **Create draft**.
3. Select the newly created draft from **Your exams**.
4. In **Add a question**, choose **Numeric**.
5. Enter a prompt such as `What is 3 × 4?`, set points to `1`, expected number to `12`, and tolerance to `0`.
6. Select **Add question**.
7. Confirm the new question card appears and **Publish readiness** says one valid question is ready.
8. Select **Publish exam** and accept the confirmation.

**Expected:** the exam moves to published/read-only state. The workspace explains that it must be unpublished before editing, and offers **Unpublish and edit**.

## SMK-005 — Teacher reviews a student attempt

**Purpose:** verify the teacher can see a submitted attempt for an owned exam.

**Depends on:** SMK-004. Keep the published *Smoke numeric exam* created in that case.

1. Sign out and sign in as `noah.student@example.test`.
2. Start *Smoke numeric exam*, enter `12`, and submit it.
3. Sign out and sign in as `teacher@example.test`.
4. Select **Results** beside *Smoke numeric exam*.
5. Confirm Noah appears in the results list with status `submitted` and score `1 / 1`.
6. Select **View attempt** for Noah.

**Expected:** the teacher sees Noah’s attempt status, score, and saved answer for *Smoke numeric exam*. Cross-teacher authorization is covered by the automated API suite.

## SMK-006 — Draft question controls and validation

**Purpose:** check the highest-value draft editor safeguards without expanding the suite into full browser regression coverage.

1. Reset the database, then sign in as `teacher@example.test`.
2. Open **Sets and Factors — Draft**.
3. Select **Duplicate** on its seeded question.
4. Confirm a second question card appears, with **Move up**, **Move down**, **Edit**, and **Delete** controls.
5. Move the second card up, then confirm the visual order changes.
6. Select **Edit** on a question, change its prompt, and select **Save question**.
7. In **Add a question**, use a choice type, replace the options with a single line such as `Only option`, and try to save it.
8. Confirm an inline validation message explains that at least two options are required.
9. Begin changing a question prompt without saving it, then select *Foundations of Arithmetic* from **Your exams**.
10. Confirm the application asks before discarding unsaved changes. Choose **Cancel** and confirm the draft remains open with the change intact.

**Expected:** duplicate, reorder, edit, and delete controls operate only in a draft. Invalid choice questions are not saved, and switching exams asks before discarding unsaved work.
