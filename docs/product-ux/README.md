# Mathematics Examination System — product and UX handoff

This directory is the implementation-facing product and experience specification for the first usable release. It complements the technical documents in `spec/`; it does not replace the API, data-model, security, or operations decisions already made there.

## Reading order

1. [Product definition](01-product-definition.md) — problem, users, scope, principles, and feature map.
2. [Journeys and information architecture](02-journeys-and-information-architecture.md) — navigation, key flows, states, and permissions.
3. [Screen and interaction specification](03-screens-and-interactions.md) — implementation-ready screen behavior.
4. [UX and content system](04-ux-and-content-system.md) — responsive, accessibility, feedback, and visual rules.
5. [Delivery requirements](05-delivery-requirements.md) — acceptance criteria, priorities, and the gap from the current PoC.

## Visual direction

These are visual references, not pixel-perfect source assets. Build the interface in HTML/CSS/components; do not embed these images in the product.

| Reference | Purpose |
| --- | --- |
| [Student dashboard](visuals/student-dashboard-reference.png) | Status-led student home and result history. |
| [Teacher workspace](visuals/teacher-workspace-reference.png) | Draft authoring, publish readiness, and results context. |
| [Mobile attempt](visuals/mobile-attempt-reference.png) | Large targets, progress, save confidence, and review on a phone. |

## Design contract

- The browser never receives answer keys for an in-progress attempt.
- A teacher’s published revision is immutable; a later edit creates a later revision.
- The system favors confidence over cleverness: explicit state, clear next actions, no silent data loss.
- Desktop is the authoring-first surface; the student attempt must be excellent on recent phone browsers.
- All user-visible language is plain, specific, and actionable.

## Current implementation status

The repository already contains a working vertical slice: local authentication, database schema/seed, automatic grading, student attempts, draft authoring, publishing, and a basic results view. Treat it as a foundation. This document set defines the target behavior and UX that the implementation should converge on.
