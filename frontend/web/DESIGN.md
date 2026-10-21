---
name: WorkSpaceHub Notebook Workspace
description: Source-first research workspace extending the existing WorkSpaceHub visual language.
colors:
  primary: "#1C4D8D"
  on-primary: "#FFFFFF"
  ink: "#0F2854"
  muted: "#64748B"
  surface: "#FFFFFF"
  canvas: "#F8FAFC"
  border: "#E2E8F0"
  error: "#B91C1C"
typography:
  headline: { fontFamily: "Inter, sans-serif", fontSize: 24px, fontWeight: 600, lineHeight: 1.4 }
  title: { fontFamily: "Inter, sans-serif", fontSize: 16px, fontWeight: 600, lineHeight: 1.5 }
  body: { fontFamily: "Inter, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.7 }
  caption: { fontFamily: "Inter, sans-serif", fontSize: 12px, fontWeight: 400, lineHeight: 1.5 }
rounded: { sm: 6px, md: 8px, lg: 12px }
spacing: { xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px }
components:
  panel: { backgroundColor: "{colors.surface}", rounded: "{rounded.lg}", padding: 16px }
  button-primary: { backgroundColor: "{colors.primary}", textColor: "{colors.on-primary}", rounded: "{rounded.md}" }
---

## Overview

An application workspace, not a marketing page. Preserve the existing navigation, font, blue palette and installed UI primitives. NotebookLM inspires the source/chat/studio workflow, not the brand.

## Colors

Blue for actions, white reading surfaces, slate borders and secondary text. Red is reserved for failures and destructive actions. Existing global theme tokens remain authoritative outside this feature.

## Typography

Use the application's existing font from the root layout; do not load another font. Body content needs comfortable Vietnamese line spacing and wrapping for long filenames.

## Layout

Desktop: 260px sources, flexible chat, 300px Studio. Below 1280px, switch between three labeled buttons controlling one visible panel. Keep independent scrolling on desktop and a reachable composer.

## Elevation & Depth

Use thin borders and tonal surfaces; existing button treatment is sufficient. No decorative gradients or animated backgrounds.

## Shapes

8px inputs/buttons and 12px panels, following existing primitives.

## Components

Reuse Button/Input/Textarea. Native details for citation excerpts and note editing. Clearly label source state, selected count, generating versus indexing, partial streaming content and failure recovery.

## Do's and Don'ts

- Keep keyboard focus visible and every input labeled.
- Never render model HTML or execute document instructions.
- Hide derived content if permission revalidation fails; do not persist content in browser storage.
- Do not imply full-document coverage for a top-k answer or excerpt overview.
