# Screen and interaction specification

## Global shell

**Desktop:** dark or high-contrast header, product name, current user, role-appropriate primary navigation, sign-out. Keep content width readable (roughly 960–1200px) and use cards only to group meaningful blocks.

**Mobile:** header collapses to brand, current section, and menu. Do not hide the current save/submit state inside a menu during an attempt.

**All screens:** loading skeleton or concise loading copy; explicit empty state; actionable error state; visible keyboard focus; no color-only status indicator.

## S1 — Sign in

| Element | Behavior |
| --- | --- |
| Email and password fields | Persistent labels, autocomplete attributes, inline format validation. |
| Submit | Disabled only while a request is active; announce progress. |
| Error | Generic credential error; never reveal whether an account exists. |
| Success | Route by verified server role. |

## S2 — Student dashboard

Use the [student dashboard reference](visuals/student-dashboard-reference.png) as hierarchy direction.

- Heading: `My exams` plus a one-sentence explanation.
- Cards must state title, instructions excerpt, status, duration if configured, and score only when policy permits.
- Primary action labels: `Start exam`, `Continue exam`, `View result`.
- Submitted cards never offer start/continue unless retakes become an explicit future policy.
- At most one progress summary; avoid gamification that obscures assessment state.

## S3 — Student attempt

Use the [mobile attempt reference](visuals/mobile-attempt-reference.png) for phone priority.

- Header: back/leave action, exam title, question position, save state, timer only if server-authoritative timing exists.
- Question card: prompt, points only if desired by product policy, semantic input control, validation/error region.
- Choices are full-width selectable rows on mobile; radio/checkbox state is visible with more than color.
- Numeric answer uses `inputmode="decimal"` and communicates accepted format/tolerance when relevant.
- Bottom actions: Previous, Review, Next. Keep Submit out of the normal forward flow until review.
- Review panel lists every question with state: Answered, Unanswered, Flagged. Selecting an item jumps to it.

## S4 — Review and submit

- Show count of unanswered questions, but never block submission solely for blank answers.
- Provide a question list with jump links.
- `Submit exam` opens a modal: “You cannot change answers after submitting.”
- On error, keep the student on review and retain answers.

## S5 — Result and history

- Title confirms submission time and finality.
- Render score, correct answers, explanations, and per-question outcomes only according to feedback policy.
- Provide `Back to my exams` and no edit controls.
- History is dashboard-first for the first release; use a dedicated history page only when volume warrants it.

## S6 — Teacher exam list

- Heading: `My exams`; primary `Create exam` button.
- Rows/cards show title, status, question count, latest revision, last update, and result count.
- Actions: Edit draft / View published exam / View results.
- Empty state explains how to create the first exam.

## S7 — Teacher draft workspace

Use the [teacher workspace reference](visuals/teacher-workspace-reference.png) as hierarchy direction.

- Metadata section: title, instructions, duration, feedback policy, availability when enabled.
- Questions section: ordered cards with type, prompt, points, completeness state, and actions Edit, Duplicate, Move, Delete.
- Publish checklist: “0 valid questions” or each concrete blocker; never a vague “invalid draft.”
- Save status is visible near the action it describes. Unsaved exit protection applies to metadata and question forms.
- Published revision is read-only. `Unpublish and edit` explains that new attempts stop and old attempts remain unchanged.

## S8 — Teacher results

- Table headers: Student, Status, Started, Submitted, Score, Revision, action.
- Attempt detail preserves snapshot context: question prompt, student answer, correctness, awarded/max points, and explanation when applicable.
- Use a side panel on desktop and full-screen detail on mobile.
- No aggregate analytics beyond score list in the first release; add filters, exports, and distributions later.
