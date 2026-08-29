---
version: alpha
name: Workspace Hub Calendar
description: A focused work calendar with Google Calendar-like interaction patterns and Workspace Hub brand colors.
colors:
  primary: "#1C4D8D"
  primary-strong: "#0F2854"
  primary-soft: "#E8F0FE"
  canvas: "#FFFFFF"
  surface: "#F8FAFC"
  surface-hover: "#F1F5F9"
  gridline: "#E2E8F0"
  text: "#0F172A"
  text-secondary: "#475569"
  text-muted: "#64748B"
  on-primary: "#FFFFFF"
  today: "#DCEBFA"
  now: "#D93025"
  success: "#15803D"
  warning: "#B45309"
  error: "#B91C1C"
typography:
  title-lg: { fontFamily: "Inter, sans-serif", fontSize: 22px, fontWeight: 500, lineHeight: 1.25, letterSpacing: -0.01em }
  title-md: { fontFamily: "Inter, sans-serif", fontSize: 18px, fontWeight: 600, lineHeight: 1.3, letterSpacing: -0.01em }
  body-md: { fontFamily: "Inter, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0em }
  body-sm: { fontFamily: "Inter, sans-serif", fontSize: 12px, fontWeight: 400, lineHeight: 1.4, letterSpacing: 0em }
  label-md: { fontFamily: "Inter, sans-serif", fontSize: 14px, fontWeight: 500, lineHeight: 1.2, letterSpacing: 0em }
  label-sm: { fontFamily: "Inter, sans-serif", fontSize: 11px, fontWeight: 600, lineHeight: 1.2, letterSpacing: 0.01em }
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  toolbar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    height: 64px
    padding: 12px 16px
  sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-secondary}"
    width: 256px
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 10px 18px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 10px 16px
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 8px 12px
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 24px
---

# Workspace Hub Calendar

## Overview

The Calendar is a dense daily-work surface for Workspace Hub members. It follows familiar Google Calendar interaction patterns: persistent navigation, compact controls, direct manipulation, quick event creation and progressive disclosure for advanced fields. It remains visually part of Workspace Hub through the existing navy-blue identity.

## Colors

- Use `primary` for the create action, focus states and selected controls.
- Use `primary-soft` and `today` for contextual selection without overpowering event colors.
- Keep the calendar canvas white and separate structure with `gridline`, not shadows.
- Preserve user-selected calendar colors for events. Do not introduce extra decorative accents.

## Typography

Use Inter throughout because it is already the product font and works well for dense scheduling interfaces. Titles use medium or semibold weights. Time labels and event metadata use compact sizes with tabular numerals where available.

## Layout

Desktop uses a 256px sidebar, a 64px toolbar and a fluid calendar grid. Tablet collapses the sidebar behind a control. Mobile prioritizes day and list views with touch targets of at least 40px. The 4px spacing base keeps controls compact without crowding.

## Elevation & Depth

The grid is flat. Hairline borders and tonal surfaces communicate hierarchy. Dialogs and floating quick-create surfaces may use one restrained shadow. Events rely on color contrast, not deep shadows.

## Shapes

Controls use pill shapes only for primary navigation actions and segmented selections. Inputs use 6px corners, dialogs use 12px corners and event blocks use 4px corners.

## Components

- Toolbar: today, previous/next, current range, view selector and overflow actions.
- Sidebar: create action, mini calendar and visible calendar filters.
- Event editor: title-first layout with progressive disclosure for attendees, recurrence, reminders and attachments.
- Event detail: readable summary with management actions hidden when permissions do not allow them.
- Calendar grid: Monday-first, current-time indicator, selectable ranges, drag and resize only for manageable events.

## Do's and Don'ts

- Do use FullCalendar interactions and accessibility primitives before custom event handling.
- Do use schema validation and library-backed recurrence parsing.
- Do preserve keyboard focus and visible focus rings.
- Do provide loading, empty and error states in context.
- Don't duplicate backend occurrence expansion in the browser.
- Don't copy Google branding, logos or exact colors.
- Don't mix Material Web components into the existing Tailwind system.

