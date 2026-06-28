# Journeys and information architecture

## Route map

| Route | Audience | Purpose |
| --- | --- | --- |
| `/login` | Anonymous | Authenticate and route by role. |
| `/student` | Student | Exam dashboard and result history. |
| `/student/attempts/:id` | Attempt owner | Take, review, or view an attempt. |
| `/teacher` | Teacher | Owned exams, create draft, results entry point. |
| `/teacher/exams/:id` | Owner | Draft editor and publish workflow. |
| `/teacher/exams/:id/results` | Owner | Results list and attempt detail. |

Routes may differ in implementation, but the information architecture and permission boundary must remain.

## Student journey: complete an exam

1. Student signs in and lands on **My exams**.
2. The dashboard groups cards as Available, In progress, and Completed. Each card states title, instructions, duration when applicable, feedback policy summary, status, and one primary action.
3. Student selects **Start exam**. Before creation, the server verifies role, publication, availability, and attempt policy. The app shows a short start summary and creates/returns the active attempt.
4. The attempt opens at Question 1. The header shows exam name, `Question n of total`, answered count, save state, and timer only when timing is actually implemented.
5. Answer changes save automatically. The screen communicates `Saving…`, `Saved`, or a recoverable `Could not save—retry` state. Do not claim saved before the server confirms it.
6. Student can use Previous/Next or a review list. The review list exposes answered, unanswered, and flagged questions without revealing correctness.
7. Student selects **Review and submit**. The review screen lists unanswered questions and provides `Return to questions` plus `Submit exam`.
8. Submission requires a confirmation dialog explaining it is final. Disable duplicate submission while the request is in flight. Server submission is idempotent regardless.
9. Result view shows score and feedback only within the revision policy. The dashboard updates to Completed.

### Student exceptions

| Situation | UX behavior |
| --- | --- |
| No exams | Explain there are no available exams; do not show a disabled start button. |
| Network save failure | Keep local selection visible, announce failure, show retry, warn before leaving if unsaved. |
| Attempt submitted elsewhere | Reload attempt state, explain it is final, show result action. |
| Unauthorized/deleted attempt | Show a neutral unavailable message and return to dashboard. |
| Feedback policy is `none` | Show submission acknowledgement only; do not display score or answers. |

## Teacher journey: author and publish

1. Teacher signs in to **My exams** and sees only owned exams with status, last updated time, question count, and result count.
2. Teacher selects **Create exam**, gives it a working title, and lands in the draft workspace.
3. The workspace has metadata, questions, and a publish-readiness panel. Changes save explicitly or are clearly marked unsaved.
4. Teacher sets title, instructions, optional duration, feedback policy, and—when that feature is enabled—availability.
5. Teacher adds a question. The form changes by question type and validates immediately:
   - Single choice: at least two non-empty unique options and one valid correct option.
   - Multiple choice: at least two non-empty unique options and one or more valid correct options.
   - Numeric: finite expected number and non-negative tolerance.
6. Teacher can edit, duplicate, reorder, and remove draft questions. Deleting requires confirmation only when it discards meaningful configured content.
7. The publish panel explains all blockers. Selecting **Publish** opens a confirmation that explains a revision snapshot is created and later draft edits do not change old attempts.
8. On success, show revision number, published status, and links to preview/results. **Unpublish** stops new starts and returns to editable draft state; it never removes existing attempts.

## Teacher journey: review results

1. Teacher opens an owned exam’s results.
2. The results table lists student, attempt status, started/submitted timestamps, score/max score, and feedback state. Sorting/filtering is optional after the first release.
3. Selecting a row opens attempt detail: student, revision, answers, awarded points, correctness, and question feedback. Teacher sees the relevant snapshot so wording remains historically accurate.
4. An empty state says no student has started yet and offers a link back to authoring, not a broken table.

## Permission model in the UX

- Student navigation never exposes teacher controls.
- Teacher navigation never exposes student attempt URLs as a way to bypass ownership.
- A `404` is preferred for resources a user must not know exist; a `403` is appropriate for role-forbidden areas.
- UI routing is convenience only. API authorization is the authority.
