---
name: WorkspaceHub
description: A compact, connected workspace for study, projects, and focused collaboration.
colors:
  brand-ice: "#E6EDF8"
  brand-midnight: "#010736"
  brand-blue: "#22396F"
  brand-navy: "#0D1C42"
  background: "#FFFFFF"
  foreground: "#3B3B3B"
  card: "#FFFFFF"
  primary: "#22396F"
  primary-foreground: "#FFFFFF"
  primary-hover: "#0D1C42"
  secondary: "#F3F3F3"
  secondary-foreground: "#3B3B3B"
  muted: "#F3F3F3"
  muted-foreground: "#616161"
  border: "#E5E5E5"
  input: "#808080"
  success: "#2E6F43"
  warning: "#795718"
  destructive: "#B42332"
  dark-background: "#1F1F1F"
  dark-card: "#252526"
  dark-primary: "#0D1C42"
  destructive-content: "#B42332"
  success-content: "#24633E"
  warning-content: "#795418"
  info-content: "#22396F"
typography:
  title: { fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em" }
  section: { fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.01em" }
  body: { fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.5, letterSpacing: "normal" }
  compact: { fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 400, lineHeight: 1.5, letterSpacing: "normal" }
  caption: { fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 400, lineHeight: 1.4, letterSpacing: "normal" }
  label: { fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, lineHeight: 1.2, letterSpacing: "normal" }
rounded:
  control: "8px"
  panel: "14px"
  dialog: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.primary-foreground}", typography: "{typography.label}", rounded: "{rounded.control}", height: "36px", padding: "8px 16px" }
  button-secondary: { backgroundColor: "{colors.secondary}", textColor: "{colors.secondary-foreground}", rounded: "{rounded.control}", height: "36px", padding: "8px 16px" }
  input: { backgroundColor: "{colors.background}", textColor: "{colors.foreground}", rounded: "{rounded.control}", height: "36px", padding: "4px 12px" }
  card: { backgroundColor: "{colors.card}", textColor: "{colors.foreground}", rounded: "{rounded.panel}", padding: "16px" }
  navigation: { backgroundColor: "{colors.card}", textColor: "{colors.foreground}", padding: "12px" }
  chip: { backgroundColor: "{colors.muted}", textColor: "{colors.muted-foreground}", rounded: "{rounded.full}", padding: "2px 8px" }
---

# Design System: WorkspaceHub

## Overview

**Creative North Star: "A clear desk for connected work"**

WorkspaceHub is a compact working environment. Preserve the existing layouts and familiar interactions while giving every feature one coherent palette. Structure comes from typography, spacing, borders, and tonal surfaces. The interface should make work easy to scan without competing with conversations, tasks, schedules, or documents.

**Key Characteristics:**
- White/gray light surfaces, charcoal text, and restrained navy actions.
- Dark mode layers charcoal surfaces with soft gray text and deep navy actions; avoid near-white control fills.
- Compact task controls, contextual details, and predictable states.
- Existing user content, permissions, and selected colors remain meaningful.

## Colors

### Primary

Navy marks primary actions: #22396F in Light and deeper #0D1C42 in Dark, with white text on filled actions. Dark filled actions have a subtle inset edge; links and data marks use a separate readable blue-gray. Links use link, while ordinary selections use primary-soft with primary-soft-foreground. Informational icon tiles use neutral secondary surfaces.

### Neutral

Light uses white canvases/cards, gray sidebars, and neutral hover surfaces. Dark uses #181818 sidebars, a #1F1F1F canvas, #252526 cards/popovers, and #313131 grouped/hover surfaces. Soft blue is reserved for selection. Brand primitives remain for logos and the existing auth brand panel.

**The Paired Colors Rule.** Use `primary` with `primary-foreground`, `card` with `card-foreground`, and each status fill with its matching foreground. Use status-content for status text/icons on neutral or status-soft surfaces; status tokens are filled backgrounds, not text colors. Use primary-soft-foreground for soft selection and link for links.

Success, warning, and destructive colors communicate functional state with muted soft surfaces. Mic/Camera off stays soft red on hover; Leave/delete confirmations keep solid destructive fills. Charts and status dots use content colors, not the darker button fills. Keep labels/icons alongside them. User-selected project, calendar, and label colors are content: preserve the stored fill and choose readable text against it. Video and document contents keep their intrinsic colors.

The runtime source of truth is `frontend/web/app/globals.css`. Frontmatter records representative values; [design tokens](docs/design-tokens.md) documents both themes, additional semantic roles, utilities, and integration rules. Use named utilities such as `bg-primary text-primary-foreground` and `bg-background text-foreground`. They follow the theme automatically; `dark:bg-primary` is redundant. Use explicit `dark:` variants only when the semantic role changes. Keep direct CSS variables for chart, gradient, SVG attribute, and third-party API properties when utilities cannot apply.

## Typography

Use Inter from `next/font` through the shared sans token. Application page titles use `text-page-title font-semibold` (22px/600); sections use `text-section-title font-semibold` (18px/600). Body and controls use 14px, metadata uses 12px, and dense task/chat content may use `text-compact` (13px). Reserve heavier weights for the brand mark and intentional document/message formatting. Public/auth display headings and the functional timer readout retain their larger scale. Use tabular numerals for durations and measured data.

## Layout

Shared controls live in `frontend/web/components/ui`; feature wrappers supply domain options, labels, adornments and density. Use CustomDatePicker for date-only values, CustomTimePicker for 24-hour times and CustomDateTimePicker (or CustomDateField for all-day switching) for local datetime values. Keep API conversion in feature helpers. Datetime edits stay in a draft until Done; Cancel/Escape discard edits. Preserve min/max, required validation, empty values and disabled states. Use CustomSelect, Checkbox/RadioGroup, Collapsible and AlertDialog for standard interactions. Use CustomColorPicker for existing palettes and optional HEX entry without changing saved color values. Task containers with secondary controls use a separate primary Button rather than nested actions. Unstyled variants require a structure-specific reason; ordinary actions use standard Button/IconButton variants. The complete inventory and native exceptions are recorded in [docs/shared-ui-inventory.md](docs/shared-ui-inventory.md).

Keep the existing responsive workspace shell, collapsible navigation, toolbars, and feature-specific panels. The spacing vocabulary follows a 4px rhythm. Dashboard panels use 16px internal padding, 24px gaps and 16/24/32px responsive page gutters. At 960px of Dashboard content width, use two equal columns with panels stretching to the tallest panel in their row; below it, stack in reading order. Pair My tasks with My day first, Upcoming meetings with Productivity (including today's focus and session count), then full-width Active projects, then Recent activity with Task activity. Place deadline, completion and workload charts in a separate Insights section after the daily-work panels. Create task is the header's primary action; eligible task rows offer a separate shared Pomodoro focus action alongside their detail link. Quick create adds an all-day personal task to today's schedule in the workspace timezone, with an optional deadline. Dashboard work and Insights panels keep a stable 30rem height on small containers and 36rem from 640px of Dashboard container width; panels in the same row stay equal when task counts, disclosure state or query state change. Their named, keyboard-focusable native scroll regions use the existing themed scrollbar, stable gutter and contained vertical overscroll. Keep headings, filters and panel-level actions in non-scrolling header/toolbar/footer slots. Show more tasks still adds six at a time; Daily totals and View data share Collapsible state across the fixed footer trigger and the content inside the scroll body. Opening data reveals it by scrolling only the panel body, preserving page position and trigger focus; closing it restores the start of that body. The three-project summary retains its natural compact height. Task activity uses a GitHub-style calendar for the inclusive six-calendar-month period ending today in the user's timezone: fixed 12px cells, 3px gaps, 2px corners, Sunday-first weeks and aligned month/weekday labels. The heatmap alone scrolls horizontally when needed, rather than enlarging cells or overflowing the page. Five solid, locally scoped green levels have separate light/dark values, matching square legend swatches, shared hover tooltips and a thin today outline; Daily totals provides every in-range date without individual cell Tab stops. The focus chart remains 240px tall when it has data. Task deadlines uses a responsive doughnut with proportional radii, a 256px chart on small containers and a 320px chart from 640px; retain the centered real task total and existing legend/tooltip values. Dashboard summary uses four separate neutral cards with 16px gaps, one/two/four columns at the existing responsive breakpoints. The greeting's small weather illustration is an intentional colorful exception: use amber/orange sun, blue-gray clouds and a blue moon, with real local conditions only after location permission. The clock-based illustration is a clearly labeled fallback, not measured weather.

Dashboard emphasis follows real work: the greeting links to a server-LIVE meeting or the next timed item today; all-day items keep their normal timeline treatment. Use semantic soft surfaces for timeline kinds, Up next, priority/due badges and unread notices, with their matching content foregrounds in both themes. Zero task counts stay neutral. The first upcoming meeting uses a selected surface and a clear View meeting action; relative times describe the schedule without implying a meeting has started. An all-zero focus week shows a compact Pomodoro invitation while keeping daily totals. Project icons use saved fills with contrast-safe foregrounds; progress remains based on real counts. The heatmap marks today and reports active days in its displayed period. Interactive color transitions are 150ms, gated by motion preference, with no repeated entrance or looping decoration.

Calendar remains a fluid grid with a sidebar and compact toolbar. Preserve its Monday-first views, selection, manageable-event dragging/resizing, and progressive disclosure. Collapse navigation on small screens; prioritize day/list interaction where appropriate. Project data keeps board, list, calendar, Gantt, and summary layouts.

Task detail drawers overlay the workspace to preserve canvas width. Anchor them to the right, use the established 560px desktop width constrained by the viewport, and fill small screens. Keep independent scrolling, a backdrop, close control, Escape handling, focus management, and body-scroll restoration.

## Elevation & Depth

Persistent panels use an opaque card surface and a border without a shadow. Floating menus use `shadow-panel`; dialogs use `shadow-dialog`. Keep these shared elevations in `globals.css`. Remove custom glows, stacked shadows, decorative gradients, and translucent application surfaces. Media overlays may retain dark translucency to keep controls readable over content.

Use 130–200ms color/opacity feedback and necessary drawer transitions. Avoid button lifting, decorative scaling, and bouncing indicators. Under reduced motion, loading, typing, recording, playback, and reaction information remains visible with static labels/icons. The Pomodoro ring is functional elapsed-time feedback and remains.

## Shapes

Use `rounded-control` (8px) for controls, `rounded-panel` (14px) for panels, and `rounded-dialog` (16px) for dialogs. Pills are for badges, avatars, and appropriate segmented controls. Calendar events retain compact 4–6px corners for dense grids; chart geometry, color swatches, media, and user-authored content keep their functional shapes.

## Components

### Shared UI ownership

- Application controls use the owned `components/ui` primitives directly or through domain wrappers. Vendor primitives, portals, popup positioning and modal focus/scroll handling belong in that layer. Do not regenerate the customized library from upstream templates.
- Keep domain state, permissions, data fetching and action callbacks in their existing modules. SearchInput and IconButton compose the existing primitives; meaningful feature wrappers retain their public contracts.
- The `unstyled` compatibility options retain existing layout, typography, SVG dimensions and native attributes while sharing interaction behavior. NativeSelect, NativeCheckbox and NativeRadio preserve native ChangeEvent/ref/peer contracts; styled Select, Checkbox and RadioGroup remain the standard compositional alternatives.
- True panels use Tabs; filter/view-mode groups use pressed buttons. CustomTabs retains its compatibility name/API for filters. Native markup remains appropriate for semantic layout/content, hidden file pickers, OTP cells, editor/media internals and library-generated DOM. The local ESLint rule and current inventory in the component audit document these boundaries.

### Component conventions

- **Dialogs:** Use the shared modal-focus helper for initial focus, Tab containment, nested popup handling, Escape, scroll locking, and focus restoration. Name each dialog and its close control. Calendar retains its previous helper import as a compatibility re-export. Mobile calendar navigation sits above its dismissing backdrop and below dialogs.
- **Empty states:** Use a restrained icon, a useful explanation, and a relevant action. Avoid nested decorative containers or icon tiles.
- **Buttons:** Reuse the shared Button and feature wrappers. Primary actions use paired action tokens; secondary, outline, ghost, and destructive variants keep their APIs. Hover, focus, disabled, and pending states remain distinct.
- **Inputs and forms:** Use readable text/placeholders, an input-boundary token, and a visible focus ring. Keep validation and pending feedback beside the relevant fields.
- **Navigation:** Keep ordinary navigation on card surfaces; selected states use a semantic accent without decorative sidebar stripes.
- **Responsive filters:** Stack project search, status, priority, and assignee controls on narrow screens; preserve selections and reset behavior. Long labels truncate inside controls without overlapping adjacent controls.
- **Navigation states:** Separate default, hover, and selected states. Selected labels and icons inherit the foreground paired with their fill. Preserve accessible names and mobile controls.
- **Cards, tables, and lists:** Use surface/text pairs and semantic borders. Keep existing density and responsive overflow behavior.
- **Calendar:** Use FullCalendar interactions and accessibility primitives. Theme both main and mini-calendar styling, today, time labels, popovers, overflow links, and the current-time indicator. Preserve user colors and permission-aware event actions.
- **Dashboard and charts:** Reuse shared application tokens and the existing Pomodoro provider. Theme chart axes, grids, series, cursor, and tooltip surfaces; preserve source identifiers and contextual states.
- **Feature emphasis:** Meetings keeps a compact time/date header and makes New meeting its primary action. Pomodoro keeps its working timer, task association, audio, modes, and history with flat statistics and one dominant start action. Documents keeps grid/list, previews, sharing, and file actions with restrained storage statistics.
- **Chat, documents, and meetings:** Theme message surfaces, previews, dialogs, controls, notifications, emoji pickers, and third-party popups. Media canvases may remain dark for content legibility; surrounding controls follow the selected theme.
- **Home and authentication:** At the user's request, preserve the original centered home hero and decorated split auth layout, display typography, labels, control geometry, and interactions. These surfaces are intentional exceptions to the workspace simplification rules; their colors still come from the semantic light/dark tokens. Auth fields use a local style override so workspace forms retain their shared styling. The standalone AI page remains unavailable; Tasks directs visitors to Projects, Calendar, and Dashboard.
- **Theme preference:** Preferences offers Light and Dark. Save Settings applies the confirmed account preference; unsaved changes and failed saves leave the appearance unchanged. Restore the saved account theme after login and persist the applied browser theme across reloads and logout.

## Do's and Don'ts

- Do use semantic color pairs instead of fixed component colors.
- Do preserve layouts, keyboard behavior, permissions, and user-selected colors.
- Do keep normal text at 4.5:1 contrast and meaningful control boundaries at 3:1.
- Do check light and dark themes, desktop and mobile, and loading/empty/error states.
- Don't introduce feature-specific palettes or fonts, decorative bounce, unsupported capability claims, or competing primary actions.
- Don't recolor uploaded content, video, or saved project/calendar/label colors.
- Don't duplicate backend rules or replace functional behavior during styling work.

Coverage, retained content exceptions, and verification limits are recorded in [the component audit](docs/ui-audit.md). The semantic message blockquote keeps its content-formatting border.
