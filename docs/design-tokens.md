# WorkspaceHub design tokens

The runtime source of truth is [globals.css](../frontend/web/app/globals.css). This reference describes the implemented system; [DESIGN.md](../DESIGN.md) explains its application and [PRODUCT.md](../PRODUCT.md) records product context.

## Brand primitives

| CSS variable | Tailwind utilities | Value | Role |
| --- | --- | --- | --- |
| `--brand-midnight` | `bg-brand-midnight`, `text-brand-midnight` | `#010736` | Original brand primitive |
| `--brand-navy` | `bg-brand-navy`, `text-brand-navy` | `#0D1C42` | Invariant brand panels |
| `--brand-blue` | `bg-brand-blue`, `text-brand-blue` | `#22396F` | Original logo/brand blue |
| `--brand-ice` | `bg-brand-ice`, `text-brand-ice` | `#E6EDF8` | Original logo/brand accent |

The workspace uses neutral white/gray Light and charcoal Dark themes inspired by VS Code Modern. Navy is reserved for actions, links, focus, and soft selection: #22396F in Light and deeper #0D1C42 filled actions in Dark. Brand primitives above remain for logos and the existing auth brand panel; they are not workspace surface tokens.

## Semantic colors

Use semantic utilities; their values follow the theme. Filled controls and ordinary text have distinct roles.

| Token | Utility | Light | Dark | Role |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | `#FFFFFF` | `#1F1F1F` | Page canvas |
| `--foreground` | `text-foreground` | `#3B3B3B` | `#CCCCCC` | Main text |
| `--sidebar` | `bg-sidebar` | `#F8F8F8` | `#181818` | Sidebar canvas |
| `--card` | `bg-card` | `#FFFFFF` | `#252526` | Cards and panels |
| `--card-foreground` | `text-card-foreground` | `#3B3B3B` | `#CCCCCC` | Card text |
| `--popover` | `bg-popover` | `#FFFFFF` | `#252526` | Menus and dialogs |
| `--popover-foreground` | `text-popover-foreground` | `#3B3B3B` | `#CCCCCC` | Floating text |
| `--primary` | `bg-primary` | `#22396F` | `#0D1C42` | Filled main actions |
| `--primary-foreground` | `text-primary-foreground` | `#FFFFFF` | `#FFFFFF` | White text on filled actions |
| `--primary-hover` | `hover:bg-primary-hover` | `#0D1C42` | `#162B55` | Main action hover |
| `--link` | `text-link` | `#22396F` | `#B0C4E0` | Links on normal surfaces |
| `--primary-soft` | `bg-primary-soft` | `#EAF0F8` | `#253247` | Ordinary selected states |
| `--primary-soft-foreground` | `text-primary-soft-foreground` | `#22396F` | `#B0C4E0` | Soft selection text/icons |
| `--secondary` | `bg-secondary` | `#F3F3F3` | `#313131` | Neutral controls/icon tiles |
| `--secondary-foreground` | `text-secondary-foreground` | `#3B3B3B` | `#CCCCCC` | Neutral control text |
| `--muted` | `bg-muted` | `#F3F3F3` | `#313131` | Grouped surface |
| `--muted-foreground` | `text-muted-foreground` | `#616161` | `#A5A5A5` | Metadata and placeholders |
| `--accent` | `bg-accent` | `#F3F3F3` | `#313131` | Ordinary hover |
| `--accent-foreground` | `text-accent-foreground` | `#3B3B3B` | `#CCCCCC` | Hover text |
| `--border` | `border-border` | `#E5E5E5` | `#3C3C3C` | Decorative separators |
| `--input` | `border-input` | `#808080` | `#808080` | Meaningful control edges |
| `--ring` | `ring-ring` | `#22396F` | `#8EAAD0` | Keyboard focus |

Use text-link for links and primary-soft/primary-soft-foreground for navigation, tabs, and ordinary selection. Keep primary/primary-foreground for action buttons. Avoid reusing a filled-button background token as text on a dark card.

Dark filled navy buttons/links get a subtle inset primary-outline edge (#637DA6) against charcoal; it does not change their dimensions. Links/data marks use a separate readable blue-gray (#B0C4E0), rather than the deep button fill. Checked switch thumbs retain a contrasting foreground.

## Functional states and charts

| Role | Light: content / soft / fill | Dark: content / soft / fill |
| --- | --- | --- |
| destructive | `#B42332` / `#FBEEEE` / `#B42332` | `#E2A1A1` / `#3A2727` / `#A63838` |
| success | `#24633E` / `#EDF5EF` / `#2E6F43` | `#91BD9D` / `#26352B` / `#285E3B` |
| warning | `#795418` / `#FAF3E7` / `#795718` | `#D2B478` / `#393124` / `#795718` |
| info | `#22396F` / `#EAF0F8` / `#22396F` | `#B0C4E0` / `#253247` / `#0D1C42` |

For each status, text-status-content is the text/icon color on neutral or status-soft surfaces; bg-status is the solid fill paired with text-status-foreground (white in both themes). Status-outline mixes 75% content with 25% soft for restrained one-pixel boundaries. Keep labels/icons alongside status colors.

Mic/Camera off uses destructive-soft, destructive-content, and destructive-outline throughout hover. Leave/delete actions remain filled destructive controls. Status badges use soft surfaces. Chart series, progress marks, and status dots use content/chart colors so dark button fills do not disappear on charcoal.

Sidebar primary tokens alias soft selection roles. Third-party widgets consume the same semantic surface/text roles.

## Type, spacing, radius, and motion

| Token/convention | Value | Usage |
| --- | --- | --- |
| `--font-sans`, `--font-heading` | Inter from `--font-inter`, then system sans | Existing application typography |
| Shared type roles | 22px title; 18px section; 14px body/label; 12px caption | Use text-page-title / text-section-title; public/auth display and timer readout are exceptions |
| Spacing rhythm | 4, 8, 12, 16, 24, 32px | Use existing Tailwind spacing utilities |
| `--radius-control` / `rounded-control` | 8px | Buttons, fields, and menu items |
| `--radius-panel` / `rounded-panel` | 14px | Persistent bordered panels |
| `--radius-dialog` / `rounded-dialog` | 16px | Dialog containers |
| `--text-compact` / `text-compact` | 13px / 1.5 | Dense task/chat content |
| `--shadow-panel` | Theme-aware offset/blur shadow | Floating panels |
| `--shadow-dialog` | Theme-aware offset/blur shadow | Dialogs |
| `--duration-fast` / `--duration-normal` | 130ms / 200ms | Feedback and interaction transitions |
| `--ease-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | New transitions consistent with existing timing |

Persistent panels use a border without a shadow. Use shared elevation only for floating menus and dialogs. Motion lasts 130–200ms; reduced motion retains static, readable feedback. Pills remain for badges, avatars, and segmented controls; compact calendar events keep their functional corners.

## Content and media exceptions

- User-selected project/calendar/label fills remain stored hex values, including their color-picker options. Do not replace these persisted values with CSS variables.
- `readableTextOnColor` selects `--on-color` (white) or `--on-color-dark` (black) for readable text against a user-selected hex fill. Other unknown CSS fills use `--primary-foreground`.
- `--media-background`, `--media-surface`, and `--media-foreground` preserve a dark video canvas and readable overlays in both themes. Surrounding controls use normal surface tokens.
- `--media-destructive` / `text-media-destructive` is the invariant #E2A1A1 alert foreground for dark media controls in both themes; ordinary alerts continue using theme-aware destructive tokens.
- `--overlay` is an invariant dark backdrop. Uploaded images, document pages, and video are not recolored.
- Use semantic utility names instead of equivalent arbitrary classes: `bg-muted`, `text-muted-foreground`, and `border-border`. Direct CSS variables remain appropriate for chart/SVG attributes, gradients, and third-party properties that do not accept utility classes.

## Theme behavior

`next-themes` applies a class to the root HTML element. New browsers default to Light, and automatic system switching is disabled. The applied theme is stored under `workspacehub-theme` and survives navigation, reload, and logout.

Preferences exposes Light and Dark. Selecting an option edits the form; Save Settings applies the server-confirmed preference. Pending or failed saves keep the current theme. Login loads that account's preference through an account-scoped React Query cache. Theme changes do not modify backend enums or API payloads.

## Examples

```tsx
<button className="rounded-control bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover">
  Save changes
</button>
<section className="rounded-panel border border-border bg-card p-4 text-card-foreground">
  <h2 className="text-section-title font-semibold">Project details</h2>
  <p className="mt-2 text-sm text-muted-foreground">Shared context for your team.</p>
</section>
<span className="rounded-full bg-success-soft px-2 py-1 text-xs text-success-content">
  Completed
</span>
```

## Shared control ownership

`frontend/web/components/ui` owns native controls and vendor primitives. Feature wrappers supply domain options, labels and density. Reuse the shared Button, Input, Select, date/time pickers, Dialog and AlertDialog before adding a custom interaction.

Hidden file inputs and poll form controls are intentional native exceptions. FullCalendar, charts, document content and media retain their existing adapters. Avoid nested interactive controls; give secondary card actions their own buttons. Keep keyboard focus visible in light and dark themes.

## Verification

Historical audit reports are archived locally; they are not runtime configuration. The repository's test suites and test-only tooling have been removed.

Run commands from `frontend/web`. Also run TypeScript, lint, and a production build. Check both themes on desktop/mobile, saved/failed preferences, account changes, keyboard focus, overlays, emoji pickers, chart tooltips, and loading/empty/error states. Normal text must reach 4.5:1 contrast; meaningful control boundaries must reach 3:1.
