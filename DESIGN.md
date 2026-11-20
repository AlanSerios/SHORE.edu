---
name: SHORE Skwela Hub
description: Design rules for SHORE student and administrator workflows.
colors:
  canvas: "#F8FAFC"
  card: "#FFFFFF"
  foreground: "#0F172A"
  muted: "#64748B"
  border: "#E2E8F0"
  border-hover: "#CBD5E1"
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  accent-blue: "#EFF6FF"
  success-surface: "#F0FDF4"
  success-foreground: "#15803D"
  danger-surface: "#FEF2F2"
  danger-foreground: "#DC2626"
spacing:
  '1': "4px"
  '2': "8px"
  '3': "12px"
  '4': "16px"
  '6': "24px"
  '8': "32px"
  '12': "48px"
rounded:
  control: "8px"
  panel: "12px"
  dialog: "16px"
---

# SHORE Design Basis

## Overview

Read this file before changing UI. Use it for registration, accounts, rosters, calendars, scholarships, dashboards, reports, and shared components. The user's newer instructions override this file; record durable corrections here after implementing them.

SHORE serves Grade 12 students, volunteers, and administrators. Students need clear next actions on phones. Administrators need readable records and dependable editing on laptops. Keep each screen focused on its task, with enough color and interaction feedback to make actions visible.

This document distinguishes recorded user preferences, engineering defaults, and current implementation gaps. Defaults below establish a consistent starting point; they do not claim that every existing component already complies.

### Recorded Taste: Learn Taste

These rules capture direct corrections from this conversation. The reasons use the user's stated concerns.

| User Correction | Lasting Rule | Reason |
| --- | --- | --- |
| “spacing ... is not consistent”; “basis na md” | Use the spacing relationships in Layout. Record any new repeated relationship here before copying it across screens. | The user repeatedly sees different spacing between equivalent elements. |
| “lahi ang design nato for phone lahi sad ... laptop” | Design the phone information hierarchy explicitly. Reflow and change disclosure where necessary at larger widths. | A laptop layout squeezed into a phone has repeatedly failed the user's review. |
| “phone kay daghan kaayo redundancy ... unneeded na texts” | Remove repeated counts, headings, helper sentences, and action labels from the same phone view. Keep labels needed to understand or operate controls. | Repetition consumes the phone's limited space. |
| “header ... every word capital like Your Study Plans” | Write page and section headings in Title Case, preserving acronyms and proper names. | The user requested this heading style. |
| “unsay pulos ... kung di ... makita ... profile picture” | Show the saved profile picture in account identity surfaces; use initials only when no usable picture exists. | The user expects the profile picture to identify the account. |
| “centered ... pag i click ... tangtangon ang view profile ... pag i click ang name” | In Account Management, open the centered profile dialog from the person's name. Avoid a second View Profile action beside it. | The name already provides the requested entry point. |
| “murag redundant ... uses ana na pages” | Keep Manage Class for student eligibility, Manage Team for volunteer eligibility, and Account Management for credentials, roles, and account profiles. | The user finds duplicated page purposes confusing. |
| “dako ... scroll”; “di ... ipit ... phone” | Split short registration/onboarding tasks into compact steps. Keep actions visible at normal laptop sizes without squeezing controls on phones. | Oversized forms require unnecessary scrolling; cramped phone forms are also unacceptable. |
| “ayaw na ibalik si skweloy”; “DILI ... KA SKIP” | Keep Iskweloy out of onboarding and keep required onboarding steps mandatory. | The user explicitly rejected the mascot and skipping in this flow. |

<!-- Captured 2026-11-19 from the user's SHORE corrections. Exact component-specific exceptions stay scoped above. -->

## Colors

The implementation source is `frontend/src/index.css`; Tailwind semantic aliases live in `frontend/tailwind.config.js`. Update these sources and this document together when changing a token. Do not create a second palette in a component.

| Purpose | Tailwind Alias | Use |
| --- | --- | --- |
| Page background | `bg-canvas` | Application workspace |
| Content surface | `bg-card` | Forms, lists, dialogs |
| Main text | `text-fg` | Titles, values, body text |
| Secondary text | `text-muted` | Metadata and optional help |
| Separators | `border-border` | Inputs, rows, panel boundaries |
| Emphasized separator | `border-borderHover` | Hover or stronger boundaries |
| Primary action | `bg-primary text-white` | Main action in the current task |
| Primary hover | `hover:bg-primaryHover` | Hover feedback |
| Selected context | `bg-accentBlue` | Active selection with text/icon cue |
| Error context | `bg-accentRed text-accentRedFg` | Error surface and message |

Use a consistent semantic role for status colors across pages. Include text or an icon so color alone never communicates registration, verification, errors, or completion. A colored badge must describe stored state; do not imply verification or security without evidence.

The success foreground token is `#15803D` (Tailwind green-700), which meets normal-text contrast on white and the pale success surface. Charts may need distinct series colors; define those in a shared chart palette rather than unrelated inline values.

## Typography

Use the configured `font-sans` stack: Inter, Geist, SF Pro Display, Helvetica Neue, sans-serif. Do not choose a new font per page. Verify which font actually loads before claiming a font change.

Engineering defaults for equivalent roles:

| Role | Classes | Use |
| --- | --- | --- |
| Page title | `text-2xl sm:text-3xl font-bold tracking-tight` | One main heading |
| Section title | `text-base font-semibold` | Group or panel heading |
| Main body and controls | `text-sm leading-5` | Admin records, descriptions, labels |
| Supporting metadata | `text-xs leading-5 text-muted` | Dates, secondary details |
| Phone text inputs | At least 16px | Prevent focus zoom; global CSS already supplies this |
| Comparable numbers | `tabular-nums` | Counts, scores, aligned numeric columns |

Use Title Case for headings and sentence case for explanatory text. Keep labels short and specific. A placeholder is an example, not the only label. Allow long names and school names to wrap; do not hide essential information behind truncation without an accessible way to read it.

## Layout

### Spacing Relationships

Use Tailwind's existing scale. One unit is 0.25rem, normally 4px. This is a usage policy on the installed Tailwind 3 scale, not an upgrade or a new dependency. Choose by relationship, then reuse the same value for that relationship.

| Relationship | Default | Example |
| --- | --- | --- |
| Label to its field; title to subtitle | 4px | `gap-1`, `mt-1` |
| Icon to text; adjacent actions | 8px | `gap-2` |
| Related fields or compact list content | 12px | `gap-3`, `space-y-3` |
| Form groups; phone panel padding | 16px | `gap-4`, `p-4` |
| Page sections; laptop panel padding | 24px | `gap-6`, `p-6` |
| Major desktop groups | 32px | `gap-8` |
| Deliberate large separation | 48px | `gap-12`; uncommon in task screens |

Use `space-y-4 sm:space-y-6` between major page blocks as the baseline. Use one layout owner for each gap: parent `gap`/`space-y` or child margin. Do not stack both to create accidental spacing. Nested content follows its own smaller relationship.

Values such as 20px and fractional steps remain valid Tailwind utilities, but require a specific component relationship or optical reason. Do not alternate 16, 20, 24, and 28px for equivalent page sections. Do not mechanically replace icon offsets, chart coordinates, safe-area formulas, or alignment dimensions with spacing tokens.

### Page Shell And Breakpoints

Reuse `PageShell` and `PageHeader` from `frontend/src/components/ui/page.jsx`. Do not duplicate their gutter and safe-area formulas in new pages.

| Width | Horizontal Gutter | Layout Behavior |
| --- | --- | --- |
| Below 640px | 16px, `px-4` | Task-first single column; concise copy; disclose secondary work |
| 640px and above | 24px, `sm:px-6` | Allow related fields/actions to share rows when they fit |
| 1024px and above | 32px, `lg:px-8` | Tables and side panels where the task benefits |

Use the existing width variants: `narrow` 56rem, `reading` 52rem, `default` 64rem, `wide` 80rem. Choose by content rather than setting a new maximum width per route. Preserve safe-area and bottom-navigation clearance. The current mobile top inset is 20px minimum; treat that as shell clearance rather than ordinary section spacing.

`shore-page-content` in `index.css` owns page padding, including `max(gutter, safe-area)` horizontal clearance. `--safe-area-left/right/top/bottom` read the browser's environment insets. PageShell applies this geometry; Calendar and Attendance use it on their existing scroll containers. Tickets, Recitations, and Manage Account reuse PageShell. Do not add a second bottom-navigation allowance inside a page section. Auth uses its own compact `shore-auth-panel` gutters and the same safe-area inputs.

Use 16px section gaps on phones and 24px on larger screens where these are the same relationship. Grouped account shortcuts can keep 12px gaps. Field text is at least 16px on touch/small screens, while PIN cells retain their intentionally larger type. Enable Tailwind's capability-gated hover variant so touch taps do not leave mouse-only hover effects behind.

### Phone And Laptop Behavior

- Show the primary task first on phones. For rosters, show records before a permanent add form; open that form on demand.
- Use compact record layouts on phones and aligned columns on laptops. Share data and handlers between both presentations.
- Give touch controls a 44px minimum hit area and adjacent targets 8px space where practical. Small visible icons can live inside larger hit areas.
- Keep 16px phone gutters. Recover space by removing redundant content and changing layout before shrinking text or tap targets.
- Use `min-w-0` for shrinkable flex/grid children. Wrap controls or move them to another row before content escapes the viewport.
- Short onboarding steps should fit normal laptop heights. On short phones, keyboard-open states, text zoom, or large validation messages, allow necessary vertical scrolling so content stays available. Never clip fields or disable zoom to satisfy a no-scroll screenshot.
- Keep dialogs centered and viewport-bounded with an accessible internal scroll region when needed. Return focus to the opener on close.

## Elevation & Depth

Use whitespace, a subtle border, and the existing surface colors to group records and forms. Use shadows for overlays or an established raised panel. Do not add a shadow to every nested group. Avoid nested cards when a divider or heading establishes the relationship.

## Shapes

Use an 8px control radius, 12px panel radius, and 16px dialog radius as engineering defaults. Preserve an existing coherent component variant when extending it. Rounded-full shapes are appropriate for avatars or compact status markers, not a default wrapper for every label or action.

## Components

| Component | Contract |
| --- | --- |
| Page header | One title, optional short description, task actions. Wrap actions at narrow widths. |
| Primary button | One main action per task group, semantic primary color, visible focus/loading/disabled feedback. |
| Form field | Persistent associated label, consistent field height/padding, error next to the field, 16px phone input text. |
| Checkbox/radio choice | One clickable label and control target. Avoid oversized option cards for short labels unless the choice needs explanatory content. |
| Roster row | Name, registration state, edit/remove actions. Profile details belong in Account Management. |
| Account identity | Saved picture with fallback, name as profile entry point, readable email where relevant. |
| Empty state | Say what is missing and provide one useful next action. Do not add oversized decoration. |
| Error state | Explain the failed operation and recovery. Preserve entered data for retry. |
| Success state | Confirm only after the operation succeeds. Keep feedback near the action. |

Motion must explain a change of state, navigation, or feedback. Apply the project motion skills when changing animations. Respect reduced motion, keep transitions interruptible, and inspect the actual result. Do not add continuous decorative motion to admin records.

The supplied Charles Liu animation reel is a reference, not a blanket animation mandate. Preserve the existing directional auth steps. Shared buttons may use a 150ms ease-out press response to 0.97 only with motion enabled. Streak content and its action must be available immediately; do not delay controls for an animated counter. Fire playback pauses outside the viewport or a hidden document; reduced motion uses the static icon. Do not introduce carousels, drag interactions, or theme effects into tasks that have no such behavior.

### Skill And Reference Routing

| Work | Use | Purpose |
| --- | --- | --- |
| General UI change | `ui-taste`, `ui-ux-pro-max`, `impeccable` | Product hierarchy, responsive constraints, craft review |
| Visible copy | `no-ai-slop`, `stop-slop` | Remove filler and repeated explanations |
| Durable user correction | `learn-taste` | Record the user's rule and reason; do not invent preferences |
| Broken behavior | `systematic-debugging` | Find the failing state and cause before editing |
| Touch/layout edge cases | `mobile-native`, `break-ui`, `web-design-guidelines` as needed | Safe areas, long content, focus and controls |
| Animation change | Project motion skills listed in `AGENTS.md` | Opportunity, implementation, and review |

Research results are inputs, not automatic design decisions. Reject a generated recommendation when it mismatches SHORE or the installed stack. The UI/UX Pro Max education query suggested Claymorphism and a new palette; neither establishes SHORE's identity.

References checked for this basis:

- [Tailwind CSS official repository](https://github.com/tailwindlabs/tailwindcss), about 98.8k stars when checked on 2026-11-18. Local reference checkout: `C:/Users/Alan Serios/Downloads/SHORE_UI_Audit_Tools/repos/tailwindcss`, commit `5e9d8c9f6f2c5a4d8123beb377a95f9493092de8`. Its main branch is newer than the app; use the v3 docs for implementation compatibility.
- [Tailwind v3 spacing](https://v3.tailwindcss.com/docs/customizing-spacing), for the installed 3.4 scale and shared spacing utilities.
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines), for keyboard/focus, content handling, forms, and responsive review.
- Existing local reference checkouts: `shadcn-ui`, `headlessui`, and `ant-design-mobile` under the same Downloads `repos` folder. Consult their relevant component patterns before borrowing; their palettes and typography do not override SHORE.

## Do's and Don'ts

Before implementation, identify the task, affected files, phone/laptop structure, relevant shared components, and important states. Read existing changes before editing. After implementation, verify the rendered result and actual behavior; a clean detector is not visual approval.

Review at 390px phone, 1024px laptop, and 1365px desktop. Add 320px for crowded controls. Include long names, loading, empty, error, retry, keyboard focus, and reduced motion where relevant. Follow the required checks in `AGENTS.md`; report what ran and what could not run.

Known drift and audit notes from the 2026-11-19 review:

- `ui/page.jsx`, `RosterManager.jsx`, and `TicketsView.jsx`: spacing, headings, and links were checked at 390px, 1024px, and 1440px with no horizontal overflow.
- `AccountsView.jsx`: role filters now keep an 8px gap, including below 360px. At 320px and 390px, all filters keep 44px hit areas and fit without overflow.
- `AccountsView.jsx`: axe found profile buttons whose explicit labels did not match their visible name and email. The buttons now build their accessible names from their content plus a screen-reader action prefix; account list and profile dialog pass axe at 320px, 390px, 1024px, and 1365px.
- `SettingsView.jsx`: now reuses PageShell, with 16/24px panel padding and one bottom-navigation allowance. Account shortcuts keep their compact 12px group gap.
- `ui/button.jsx` and `ui/card.jsx`: some semantic aliases have no definition in the current Tailwind config. Audit actual variants before reuse.
- `AvatarBorder.jsx`: the detector flags the purple/pink/indigo Nebula cosmetic border. This is scoped to the named avatar cosmetic, not the application palette; retain it unless the cosmetic itself changes.

Do not treat source findings as proof of rendered failure or as permission for a global replacement. Fix the relevant component, inspect it at the required sizes, and remove each item only when evidence confirms the correction.
