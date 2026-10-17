---
name: WorkspaceHub
description: A compact, connected workspace for study, projects, and focused collaboration.
colors:
  brand-ice: "#E6EDF8"
  brand-midnight: "#010736"
  brand-blue: "#22396F"
  brand-navy: "#0D1C42"
  background: "#FFFFFF"
  foreground: "#010736"
  card: "#FFFFFF"
  primary: "#22396F"
  primary-foreground: "#E6EDF8"
  primary-hover: "#0D1C42"
  secondary: "#E6EDF8"
  secondary-foreground: "#010736"
  muted: "#F3F4F7"
  muted-foreground: "#53617C"
  border: "#CDD2DD"
  input: "#78849D"
  success: "#18633E"
  warning: "#805313"
  destructive: "#B42332"
  dark-background: "#010736"
  dark-card: "#0D1C42"
  dark-primary: "#E6EDF8"
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
- White light-theme surfaces, navy text/actions, and ice blue accents.
- Dark mode layers midnight, navy, and blue surfaces with ice blue text/actions.
- Compact task controls, contextual details, and predictable states.
- Existing user content, permissions, and selected colors remain meaningful.

## Colors

### Primary

Blue marks primary actions in Light; ice blue marks them in Dark. Use paired foreground tokens for filled controls. Selection uses ice blue in Light and blue in Dark.

### Neutral

White is the light canvas and card/popover surface; blue-tinted muted surfaces support grouping, while ice blue marks accents and selection. Dark mode uses midnight for the canvas, navy for cards/popovers, and blue for grouped and selected areas. Secondary text stays readable, including placeholders and metadata.

**The Paired Colors Rule.** Use `primary` with `primary-foreground`, `card` with `card-foreground`, and each status fill with its matching foreground. Use `info` or `primary-soft-foreground` for text on their matching soft surfaces.

Success, warning, and destructive colors communicate functional state. Keep labels/icons alongside them. User-selected project, calendar, and label colors are content: preserve the stored fill and choose readable text against it. Video and document contents keep their intrinsic colors.

The runtime source of truth is `frontend/web/app/globals.css`. Frontmatter records representative values; [design tokens](docs/design-tokens.md) documents both themes, additional semantic roles, utilities, and integration rules. Use named utilities such as `bg-primary text-primary-foreground` and `bg-background text-foreground`. They follow the theme automatically; `dark:bg-primary` is redundant. Use explicit `dark:` variants only when the semantic role changes. Keep direct CSS variables for chart, gradient, SVG attribute, and third-party API properties when utilities cannot apply.

## Typography

Use Inter from `next/font` through the shared sans token. Application page titles use `text-page-title font-semibold` (22px/600); sections use `text-section-title font-semibold` (18px/600). Body and controls use 14px, metadata uses 12px, and dense task/chat content may use `text-compact` (13px). Reserve heavier weights for the brand mark and intentional document/message formatting. Public/auth display headings and the functional timer readout retain their larger scale. Use tabular numerals for durations and measured data.

## Layout

Keep the existing responsive workspace shell, collapsible navigation, toolbars, and feature-specific panels. The spacing vocabulary follows a 4px rhythm. Dashboard panels use 16px internal padding and 24px page spacing, with two columns on desktop and one on mobile. Preserve the compact summary row, today's timeline, task list, and focus panel.

Calendar remains a fluid grid with a sidebar and compact toolbar. Preserve its Monday-first views, selection, manageable-event dragging/resizing, and progressive disclosure. Collapse navigation on small screens; prioritize day/list interaction where appropriate. Project data keeps board, list, calendar, Gantt, and summary layouts.

Task detail drawers overlay the workspace to preserve canvas width. Anchor them to the right, use the established 560px desktop width constrained by the viewport, and fill small screens. Keep independent scrolling, a backdrop, close control, Escape handling, focus management, and body-scroll restoration.

## Elevation & Depth

Persistent panels use an opaque card surface and a border without a shadow. Floating menus use `shadow-panel`; dialogs use `shadow-dialog`. Keep these shared elevations in `globals.css`. Remove custom glows, stacked shadows, decorative gradients, and translucent application surfaces. Media overlays may retain dark translucency to keep controls readable over content.

Use 130–200ms color/opacity feedback and necessary drawer transitions. Avoid button lifting, decorative scaling, and bouncing indicators. Under reduced motion, loading, typing, recording, playback, and reaction information remains visible with static labels/icons. The Pomodoro ring is functional elapsed-time feedback and remains.

## Shapes

Use `rounded-control` (8px) for controls, `rounded-panel` (14px) for panels, and `rounded-dialog` (16px) for dialogs. Pills are for badges, avatars, and appropriate segmented controls. Calendar events retain compact 4–6px corners for dense grids; chart geometry, color swatches, media, and user-authored content keep their functional shapes.

## Components

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
