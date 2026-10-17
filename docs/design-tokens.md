# WorkspaceHub design tokens

The runtime source of truth is [globals.css](../frontend/web/app/globals.css). This reference describes the implemented system; [DESIGN.md](../DESIGN.md) explains its application and [PRODUCT.md](../PRODUCT.md) records product context.

## Brand primitives

| CSS variable | Tailwind utilities | Value | Role |
| --- | --- | --- | --- |
| `--brand-midnight` | `bg-brand-midnight`, `text-brand-midnight` | `#010736` | Dark canvas / main light text |
| `--brand-navy` | `bg-brand-navy`, `text-brand-navy` | `#0D1C42` | Dark cards and invariant brand panels |
| `--brand-blue` | `bg-brand-blue`, `text-brand-blue` | `#22396F` | Light primary / dark grouped surfaces |
| `--brand-ice` | `bg-brand-ice`, `text-brand-ice` | `#E6EDF8` | Light accents / dark text and primary actions |

Light uses white surfaces with ice blue accents and navy text/actions. Dark uses layered navy surfaces with ice blue text/actions. Derived blue-tinted shades provide readable secondary text and visible control boundaries.

## Semantic colors

Use semantic utilities in components; their values change with the theme.

| CSS variable | Tailwind utility | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | `#FFFFFF` | `#010736` | Page canvas |
| `--foreground` | `text-foreground` | `#010736` | `#E6EDF8` | Main text |
| `--card` | `bg-card` | `#FFFFFF` | `#0D1C42` | Cards and panels |
| `--card-foreground` | `text-card-foreground` | `#010736` | `#E6EDF8` | Text on cards |
| `--popover` | `bg-popover` | `#FFFFFF` | `#0D1C42` | Menus, dialogs, and floating panels |
| `--popover-foreground` | `text-popover-foreground` | `#010736` | `#E6EDF8` | Text on floating panels |
| `--primary` | `bg-primary` | `#22396F` | `#E6EDF8` | Filled primary action |
| `--primary-foreground` | `text-primary-foreground` | `#E6EDF8` | `#010736` | Text/icons on primary action |
| `--primary-hover` | `bg-primary-hover` | `#0D1C42` | `#FFFFFF` | Primary action hover |
| `--primary-soft` | `bg-primary-soft` | `#E6EDF8` | `#22396F` | Subtle selection |
| `--primary-soft-foreground` | `text-primary-soft-foreground` | `#22396F` | `#E6EDF8` | Text on subtle selection |
| `--secondary` | `bg-secondary` | `#E6EDF8` | `#22396F` | Secondary action surface |
| `--secondary-foreground` | `text-secondary-foreground` | `#010736` | `#E6EDF8` | Text on secondary action |
| `--muted` | `bg-muted` | `#F3F4F7` | `#22396F` | Grouped/recessed surface |
| `--muted-foreground` | `text-muted-foreground` | `#53617C` | `#C3C9D6` | Secondary text and placeholders |
| `--accent` | `bg-accent` | `#E6EDF8` | `#22396F` | Row/control hover |
| `--accent-foreground` | `text-accent-foreground` | `#010736` | `#E6EDF8` | Text on hover |
| `--border` | `border-border` | `#CDD2DD` | `#344B7C` | Decorative dividers |
| `--input` | `border-input` | `#78849D` | `#8597BB` | Meaningful input boundaries |
| `--ring` | `ring-ring` | `#22396F` | `#E6EDF8` | Focus indicator |

Use `text-primary` for action links on standard surfaces and `text-info` on information surfaces. Pair filled controls with their matching foreground. `bg-primary` automatically follows the active theme; adding `dark:bg-primary` repeats the same rule. The same mappings support text, borders, rings, SVG fills/strokes, gradients, and opacity modifiers such as `bg-primary/10`.

## Functional states and charts

| Role | CSS variables | Light fill/text | Dark fill/text | Soft surface (light / dark) |
| --- | --- | --- | --- | --- |
| success | `--success`, `--success-foreground`, `--success-soft` | `#18633E` / `#FFFFFF` | `#86D6AE` / `#010736` | `#E5F2EB` / `#173F38` |
| warning | `--warning`, `--warning-foreground`, `--warning-soft` | `#805313` / `#FFFFFF` | `#F0CD88` / `#010736` | `#FAEFD9` / `#423E36` |
| destructive | `--destructive`, `--destructive-foreground`, `--destructive-soft` | `#B42332` / `#FFFFFF` | `#FFB4BC` / `#010736` | `#FBE9EC` / `#512E46` |
| info | `--info`, `--info-foreground`, `--info-soft` | `#22396F` / `#E6EDF8` | `#B7C8F0` / `#010736` | `#EDF0F6` / `#22396F` |

Use paired foregrounds on filled states and the state color as text on its soft surface. Keep a label/icon alongside the color. Chart colors `--chart-1` through `--chart-5` cover primary, secondary, warning, success, and destructive series. Theme chart tooltips, axes, cursor, and grid as well as the series.

Sidebar tokens alias the corresponding card, foreground, primary, accent, border, and ring roles. Existing shadcn components consume these same variables.

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
<span className="rounded-full bg-success-soft px-2 py-1 text-xs text-success">
  Completed
</span>
```

## Verification

Run the existing dashboard tests with:

```powershell
node --test features/dashboard/utils/dashboard.utils.test.mjs
```

The temporary theme/color tests, browser suite, and audit scripts from the UI work were removed at the user's request. Previous verification results remain documented in `docs/ui-audit.md`.

Run commands from `frontend/web`. Also run TypeScript, lint, and a production build. Check both themes on desktop/mobile, saved/failed preferences, account changes, keyboard focus, overlays, emoji pickers, chart tooltips, and loading/empty/error states. Normal text must reach 4.5:1 contrast; meaningful control boundaries must reach 3:1.
