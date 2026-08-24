---
name: workspace-hub-design
version: 1.0.0
product: Workspace Hub
---

# Workspace Hub Design

## Direction

Workspace Hub uses a compact, Jira-inspired workspace UI. Dense project data stays readable through clear hierarchy, restrained decoration, and predictable interaction states. Detail surfaces should overlay the workspace when preserving canvas width is more important than showing both surfaces side by side.

## Tokens

- Primary action: `#0052CC`
- Primary hover: `#0747A6`
- Heading/strong text: `#172B4D`
- Body text: `#42526E`
- Surface: `#FFFFFF`
- Subtle surface: Slate 50
- Border: Slate 200
- Destructive: Red 600/700
- Radius: small, generally 4–8px
- Spacing: compact 4px-based rhythm
- Motion: 200ms entrance and interaction transitions; respect reduced-motion preferences

## Components

### Right drawer

- Overlay the workspace instead of reducing its width.
- Anchor to the right edge and use the full viewport height.
- Use a 560px desktop width, constrained by the viewport; use full width on small screens.
- Provide a dimmed backdrop, close button, Escape handling, and body-scroll lock.
- Keep the drawer content independently scrollable.

## Accessibility

- Interactive controls need accessible names and visible focus states.
- Modal drawers use dialog semantics and restore normal page scrolling when closed.
- Motion must be disabled when `prefers-reduced-motion` is enabled.
