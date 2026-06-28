# UX, accessibility, and content system

## Visual language

- **Tone:** calm, academic, capable. Avoid childish gamification and high-alert red unless an error needs attention.
- **Color:** navy/ink for structure and primary actions; white surfaces; pale neutral background; green/amber/red only alongside text/icon state.
- **Typography:** one clear sans-serif family, 16px minimum body text, large task headings, comfortable line height.
- **Spacing:** use a small token scale (4, 8, 12, 16, 24, 32, 48px). Never use dense control clusters as the only mobile interaction.
- **Cards:** use them to segment exams/questions, not as decoration around every paragraph.

## Interaction rules

| Pattern | Rule |
| --- | --- |
| Primary action | One visually dominant action per task region. |
| Destructive/final action | Explain impact and require confirmation for submit, delete, and publish. |
| Autosave | Announce saving/saved/error; retain unsaved input after an error. |
| Validation | Validate as the user completes a field and again at submit/publish. Put the summary before the action and field errors adjacent to fields. |
| Async loading | Preserve layout; never leave a blank screen without explanation. |
| Navigation | Warn before abandoning unsaved teacher changes or an answer that has not saved. |

## Accessibility baseline

- Use native controls first. Associate every input with a visible `<label>`.
- Keyboard order follows visual order; every custom control is operable with keyboard.
- Maintain a visible focus indicator with at least 3:1 contrast against adjacent colors.
- Use an `aria-live="polite"` region for save state and a focused error summary for failed form submission.
- Do not rely only on color for status/correctness; combine icon, label, and color.
- Meet WCAG 2.2 AA contrast and target 44×44 CSS px touch targets on mobile.
- Dialogs trap focus, have a labelled title, explain consequences, and return focus to the initiating control.
- Use meaningful heading hierarchy: one `<h1>` per page, then sequential sections.

## Content style

Write in direct, task-oriented language.

| Avoid | Prefer |
| --- | --- |
| “Invalid state” | “This attempt has already been submitted.” |
| “Operation failed” | “We could not save your answer. Try again.” |
| “Proceed” | “Publish exam” / “Submit exam” |
| “No data” | “No students have started this exam yet.” |

Never display database errors, stack traces, user enumeration clues, session data, answer keys in active attempts, or raw JSON to students.

## Responsive breakpoints

- **≥1024px:** two-column teacher workspace and data tables.
- **640–1023px:** single-column content with inline sections; preserve primary actions.
- **<640px:** student-first compact mode; question inputs are full width, review/action bar remains reachable, teacher results use stacked rows/detail panels.

The mobile attempt must be tested as a real flow, not just visually scaled desktop content.
