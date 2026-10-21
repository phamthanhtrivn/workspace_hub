# WorkspaceHub UI simplification audit

## Compact focus and activity panel rows - 2026-10-21

- Use the collapsed Task activity date range/legend as the Recent activity / Task activity row's content boundary: 24rem from a 640px Dashboard container width, 28rem on small containers. Keep the rolling six-month range based on today/timezone. Use Open Pomodoro as the Upcoming meetings / Productivity row's empty-state boundary: 28rem from 640px, retaining 30rem on small containers for wrapped text and touch controls. Both rows shrink from the older 36rem desktop height, and each pair shares named height classes with its loading skeletons.
- Preserve bounded native scroll bodies, fixed headers/footers, notification/meeting entries, the recorded-focus chart and both Daily totals disclosures. Productivity keeps its two summary metrics side by side on narrow screens and tightens mobile empty-state spacing so the action remains visible. Expanded data scrolls inside its panel without changing row heights, page position or trigger focus. This UI change leaves API fetching, existing user item-limit edits, permissions and data calculations intact.
- Verification: scoped ESLint and TypeScript passed. Headless Chromium fixtures rendered the actual four panels at 1440px, 390px and 320px in Light/Dark, with mocked query/store boundaries. Checks cover equal row heights, date-range/Open Pomodoro visibility, ten-entry scroll lists, stable expansion/collapse, 184 activity dates and seven focus-day totals, fixed controls/focus/page position, zero and recorded focus, loading/empty/error states and no horizontal page overflow. Desktop/mobile captures were reviewed; authenticated backend calls were not exercised. Temporary test fixtures, scripts, bundles, browser profiles and captures were removed after verification.


## Header notification lists - 2026-10-21

- Reproduced the task-notification layout defect in Chromium: the default renderer occupied about 267px in a 404px list and inherited centered text. Accepted/declined invitation rows shared the missing full-width/left-alignment classes; other renderers placed timestamps differently. Borders belonged to each renderer, so last-child rules also removed separators independently of the list.
- All seven list renderers now compose NotificationListRow, which uses the owned Button and category icon. It owns full-width, left-aligned, wrapping title/description content, a timestamp below the content, a reserved unread indicator, semantic read/unread surfaces and keyboard focus. Keep each renderer's domain title, invitation/status badge, schedule and callbacks. NotificationItem owns row separators and a separate 44px shared IconButton for deletion, with content padding reserved only when that action exists. Modal renderers, API modules and action hooks remain unchanged.
- Bound the bell popup to the viewport/available popover height. Headers, category/time/read filters and pagination remain outside the list scroll body. Wrap header/read-filter controls on narrow screens, retain horizontal category navigation, add an accessible keyboard-scroll region and restore its start when reopening/changing page or filters.
- Verification: scoped ESLint and TypeScript passed. Headless Chromium fixtures use the actual dropdown, registry, all renderers, Redux reducer, mutation hook, date controls, confirmation and detail dialog with mocked API/profile/navigation boundaries. At 1440x900, 390x844 and 320x568 in Light/Dark, checks cover all notification types plus document fallback across five pages, category/read filters, full-row backgrounds/alignment, long strings, date range, viewport/footer bounds, scroll reset, separate delete targets, delete cancellation/confirmation, opening details, mark-all-read and Escape/focus. Empty/error/retry/loading states and keyboard scrolling were also checked. All seven modal renderer implementations compare unchanged against HEAD. Desktop/mobile screenshots were reviewed; authenticated backend writes were not exercised. Temporary fixtures, scripts, browser profiles and captures were removed after verification.


## Compact Dashboard Insights panels — 2026-10-21

- Limit this density change to the three Insights panels in the user's screenshots. Task deadlines and Completion trend now use 28rem on small Dashboard containers and 30rem from 640px, down from 30rem/36rem. Project workload uses 26rem instead of 30rem/36rem. Daily-work panel heights remain unchanged. Authentication/loading skeletons share the new named height constants.
- Keep paired chart panels equal, headers/toolbars/footers fixed, and View data inside the existing scroll body. Retain the centered doughnut and legend, reducing the chart canvas to 224px/288px and tightening legend spacing. Completion and workload canvases adapt on narrow containers so axes fit before expanding data. No query, calculation, task filter, API payload or permission logic changes.
- Verification: real components rendered in headless Chromium at 1440px, 390px and 320px in Light/Dark. Collapsed charts fit their scroll body at all six combinations; opening/closing both data disclosures preserves panel dimensions and positions while scrolling the expanded rows internally. Empty/loading/error heights, real task totals and no horizontal page overflow passed; desktop/mobile captures were visually reviewed. TypeScript, scoped Dashboard lint and all ten existing Dashboard tests passed. Fixtures mock query boundaries; authenticated backend flows were not exercised. Temporary verification files were removed after checks.

## Portaled Select/Assignee visibility in task drawers — 2026-10-21

- Reproduced the Projects task drawer defect with the actual Sheet and task controls: an editable Assignee trigger was visible and clickable, but its portaled list inherited feature z-20 beneath the drawer's z-110. Labels and Dependencies also supplied a lower root z-index. Read-only disablement remains intentional.
- Share the layer-120 constant across Select, Popover, anchored popups, Menu and Combobox. Radix root classes apply the shared layer after feature classes, preventing ordinary feature z-index overrides from hiding the content. Remove eight obsolete root overrides across Projects, Chat, Meetings and Pomodoro; keep inner Base UI Popup layers where their separate Positioner already owns the portal layer. Assignee and Priority lists follow the anchor width. Extend workspace/shared-ui to flag direct root popup and wrapper popup-class z-index overrides.
- Browser verification at 1440px, 390px and 320px in Light/Dark covered pointer hit testing above the drawer, member IDs and null on unassign, label/dependency/parent IDs, Priority, read-only disablement, Escape/focus restoration, shared Select/Popover/date picker in Dialog and Project filter outside a modal. TypeScript and eight in-memory lint-rule cases passed. Across modified production sources, lint retains the same nine baseline errors and one warning in two existing consumer files, with no new diagnostics; the eight new-rule violations on the old classes are resolved. No business handlers, permission checks or API values changed. Tests used isolated fixtures, not authenticated backend writes; temporary fixtures/scripts/profiles/captures were removed after verification.


## Dashboard stable panel scrolling and larger deadline chart — 2026-10-21

The user approved bounded scrolling for long Dashboard panels on laptop and mobile, stable equal-height panels in each row, and fixed panel-level controls. This supersedes the older natural-height/no-panel-scrolling guidance below.

- DashboardPanel owns a named, keyboard-focusable native scroll body, using the existing themed scrollbar, a stable gutter and contained vertical overscroll. Bounded panels are 30rem on small Dashboard containers and 36rem from a 640px container width. Headers, optional filter toolbars and action footers do not scroll; the existing two-column breakpoint and reading order remain. Active projects retains its compact natural height because its three entries are already capped. Loading skeletons share the panel height classes.
- My tasks keeps filtering, per-filter limits and six-task increments. Its filter, Show more/fewer, counts and destination links stay outside the scroll region. Changing filters or showing fewer restores the start of the list. My day, Upcoming meetings and Recent activity share the same bounded body without changes to their entries, navigation, queries or permissions.
- Productivity/Task activity Daily totals and Insights View data reuse the owned Collapsible across a fixed footer trigger and content inside the scroll body. Expansion reveals data by scrolling only the panel body, keeping page position and trigger focus. Closing restores the body start. The complete six-month activity list and all chart rows remain available; the activity heatmap retains its horizontal scroll region.
- Task deadlines now uses a 256px chart on small containers and 320px from 640px, with proportional inner/outer radii and a larger desktop center total. Center the chart and legend together within the available body height and a shared maximum width; let the group grow into the scroll region when space is limited. This enlarges the circle while preserving category counts, percentages, legend, tooltip and theme colors.
- Verification: TypeScript and scoped Dashboard ESLint passed; the existing ten dashboard contract tests passed. Headless Chromium fixtures rendered the real components with mocked query/store boundaries at 1440px, 390px and 320px in Light/Dark. Checks covered fixed row heights/positions across task increments and all four disclosures, retained task filtering/collapse, keyboard scrolling and toggling, fixed footer controls, preserved page position/focus, all 184 activity dates, empty/loading/error states, no page horizontal overflow and larger responsive doughnut bounds/real total labels. Desktop/mobile screenshots were visually reviewed. This verifies isolated UI behavior; authenticated live backend flows were not exercised. Temporary fixture, scripts, browser profiles, bundles and screenshots were removed after verification per the user's preference.

## Shared controls across the web — 2026-10-21

Reviewed all 456 existing TSX files; the updated [shared UI inventory](shared-ui-inventory.md) lists 458 files including the two new picker components. The owned `components/ui` directory remains authoritative; no shadcn regeneration, backend/API changes, layout redesign or theme replacement was performed.

- Migrated all 18 date/datetime widgets: date range (2), registration (1), Calendar time fields (2), recurrence (1), meeting scheduling (1), Pomodoro report (2), project creation/settings (4), task date range/properties (4), profile (1). Date pickers support min/max, month/year selection, optional clearing, form validation proxies, ref/id and accessible errors. Datetime pickers edit a draft and commit once with Done; Cancel/Escape discard it. Local `yyyy-MM-dd`, `HH:mm` and `yyyy-MM-ddTHH:mm` strings still flow into the existing feature conversion helpers.
- Migrated all eight NativeSelect instances in chat media/pins/threads, document sharing (three), recordings and recording controls. Option values, empty values, disabled options and callbacks retain their existing meanings. Nine visible checkbox adapters and the recurrence radio group now use the owned primitives; OTP uses shared Input with its original input/paste/navigation handlers.
- Replaced three details disclosures with Collapsible, preserving their initial open state. Invitation confirmation uses AlertDialog with a request guard, blocked dismissal during saving, existing API identifiers and success updates, and retry on error. Removed the unused SweetAlert2 dependency and styles.
- Unified calendar/project color palettes under CustomColorPicker with draft HEX entry and Apply; saved colors are not normalized or rewritten. Calendar/Meeting/Project wrappers delegate control styling to shared components and retain density/adornments. Fifty-two ordinary actions now use standard Button variants, including shared semantic success/warning/soft variants; 58 ordinary icon actions now use IconButton. Task card/list/Gantt primary actions use sibling Buttons, preserving secondary controls, permissions and drag handlers.
- Reviewed the remaining 224 unstyled usages as structure-specific hit areas, navigation, selectable surfaces, content/media controls and existing Home/Auth presentation. This count includes owned UI; it is not a requirement to remove every unstyled variant. Do not force content-only components to import UI.
- Extended `workspace/shared-ui` to reject visible native date/time widgets even through Input aliases, NativeSelect/Checkbox/Radio adapters without a documented hidden exception, details/summary and SweetAlert2 imports. Retained nine hidden upload inputs, the hidden native poll controls that preserve voting semantics, the owned validation proxy, and vendor-owned calendar/chart/media/document DOM. Exact locations are in the inventory.

Verification: TypeScript passed. Twenty-two Node tests passed across dashboard contracts and focused control regression checks (draft Done/Cancel/Clear, required/min/max/leap years, local strings/all-day helpers, selection values, HEX drafts, OTP, disclosure state, invitation cancellation/duplicate/error/retry, task actions and drag permissions). Full lint retains the same **210 baseline errors**, with **no new errors/warnings** and **zero workspace/shared-ui violations**. Temporary tests/loader scripts were removed after verification at the user's request; pre-existing dashboard tests remain. No browser is connected, so live laptop/mobile, light/dark, keyboard/Escape/focus return, portaled controls inside modals and backend end-to-end behavior remain unverified.

## Dashboard daily actions — 2026-10-21

- Prioritize My tasks / My day, followed by Upcoming meetings / Productivity and the existing project/activity panels. Move deadline, completion and workload charts to Insights below daily work. Retain the two-column content-container breakpoint and mobile reading order; align the auth skeleton with the new order.
- Make Create task the header's primary action and offer it in relevant empty task states. The on-demand dialog validates title/deadline, selects only the signed-in user's personal calendar and adds an all-day task for today in the workspace timezone. Preserve drafts on errors, block duplicate submissions/dismissal while saving, refresh calendar/focus queries and return the task filter to All after creation. Creation lives in the existing dashboard API module.
- Offer the existing shared Pomodoro focus control alongside eligible task links, keeping buttons outside navigation links. Reuse existing eligibility checks, source identifiers, validation, timer state and switch confirmation; overdue and review tasks remain listed even when ineligible for focus. Task filters use the existing chart-style segmented selection pattern.
- Component reuse: Dashboard retains the short title/deadline form and labeled Start focus / Resume focus actions. Calendar task creation and Dashboard now share CalendarTaskTitleField and CalendarTaskDeadlineFields, including labels, the title-length limit and field-specific accessible errors. Calendar event title presentation stays as before.
- Deadline controls now compose the shadcn Calendar/Popover pattern with the owned Button/Select components. Shared CustomDatePicker and CustomTimePicker replace native date/time widgets in Calendar, Dashboard and Pomodoro deadline fields, with Monday-first navigation, dd/MM/yyyy presentation, exact 24-hour/minute selection and optional-time clearing. Keep API dates as yyyy-MM-dd and times as HH:mm; retain required-date form validation and disable portaled controls during saves. Remove the workspace-timezone explanation from the Dashboard form. Add react-day-picker and date-fns without regenerating the existing UI library.
- Verification: focused ESLint and TypeScript with noEmit/incremental disabled passed. Ten Node tests cover input validation, personal-calendar ownership, workspace-day boundaries, disabled deadlines, focus eligibility, shared-session delegation/state, separate task/focus controls, error associations/form registration, date-only round trips, exact minute values and required/disabled picker controls. Run with `node --test features/dashboard/tests/dashboard-actions.test.mjs` from `frontend/web`. The final focused design detector returned no findings; diff whitespace checks passed. No browser surfaces are connected in this session, so live laptop/mobile layout, keyboard/modal interactions and backend end-to-end behavior remain unverified.

Updated 2026-10-18. This records the approved targeted simplification. Inter, workflows, permissions, backend contracts, and saved-theme behavior remain product constraints. The current approved palette is the neutral Modern theme described below; older navy/ice sections are historical. Counts identify review candidates; they do not prove AI authorship.

The original inventory contains **417 TSX files** across **687 source files**. Every TSX file is listed below: **328 change**, **70 keep**, and **19 functional/content exception**. An exception may include changes to surrounding interface styling. Shared focus logic is listed separately. The added tests, temporary scripts, Playwright setup, and generated test reports were subsequently removed at the user's request; the verification results below are historical.

<!-- dashboard-activity-calendar:start -->
## Task activity: GitHub-style six-month calendar — 2026-10-18

Replaces the earlier enlarged 12-week heatmap with the approved rolling six-calendar-
month range, inclusive of the start and today in the configured user timezone.
The pure activity helper constrains invalid month days, groups existing completion
timestamps by local date, adds Sunday/Saturday padding and computes real totals,
active days and month column positions. Padding never contributes counts, tooltips
or Daily totals entries. Crowded initial partial-month labels are omitted when the
next month starts within two week columns; the full date range remains visible.

The owned calendar component keeps 12px square cells, 3px spacing and 2px corners,
with month headings and Mon/Wed/Fri aligned to the same grid. A CSS module scopes
the approved five solid levels separately to light/dark without changing global
palette tokens. Square legend swatches reuse the cell colors; today's marker is a
thin token-based outline. Only the named, focusable calendar region scrolls
horizontally. The detailed list grows naturally when expanded.

Shared UI Tooltip/Provider/Trigger/Content render date/count hover details on
non-actionable spans. Cells have no sequential Tab stops or pointer cursor;
keyboard and touch users can read all dates and exact counts in Daily totals.
The query key, fetching, permissions, source deduplication and error/retry behavior
remain unchanged. Cached data stays visible on refresh errors; initial loading and
errors do not render a false zero total. No packages or test/script files added.

Reference: https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/viewing-contributions-on-your-profile
Verification: focused ESLint and one non-incremental TypeScript pass succeeded.
In-memory helper checks covered inclusive boundaries, constrained month ends,
leap years, local midnight, invalid completion timestamps, padding, intensity
levels, month-label spacing and matching daily/summary totals. The October 18,
2026 fixture spans April 18–October 18 (184 counted days in 28 padded week columns).
Static rendering of the actual component with existing shared tooltips covered
pending, initial error, empty, success and cached refresh errors. It confirmed one
calendar Tab stop, no sequential cell Tab stops, no tooltip on padding, one today
marker and an exact-count list for every in-range day. CSS parsing confirmed the
two five-level palettes and fixed cell/gap dimensions. Browser inventory is empty;
live desktop/mobile layout, theme switching, hover tooltips, keyboard scrolling
and disclosure interactions remain unperformed. No cache setup or test files added.
<!-- dashboard-activity-calendar:end -->

<!-- dashboard-context-polish:start -->
## Dashboard context and theme polish — 2026-10-18

Retains the approved equal-column layout, stat cards, weather/location preference,
queries and existing navigation. A pure context helper chooses the next valid,
future, timed item in today's configured timezone; all-day and invalid dates are
excluded without reordering the timeline. Header Up next waits for all timeline
sources to have data, and a meeting with server LIVE status takes header precedence.
The shared 30-second clock updates relative schedule labels; passing a scheduled
time never synthesizes LIVE. Cached query data and existing error/retry feedback
remain available, and the default greeting does not claim the schedule is empty.

The extracted My day section adds distinct semantic icon tiles and an Up next badge.
Zero overdue/due counts stay neutral; positive counts use their semantic roles.
Upcoming meetings emphasize the first/LIVE rows and keep View meeting permissions
in the existing destination. Task due/priority badges, unread notification labels,
project progress metadata and today/active-day heatmap annotations improve scanning.
Saved project fills use the existing readableTextOnColor helper for icon foregrounds.
An all-zero focus week replaces the empty chart with an Open Pomodoro invitation,
keeping real zero metrics and Daily totals. Positive weeks retain the existing chart.

All new surfaces use existing light/dark semantic tokens. Hover/pressed/focus
feedback uses shared controls and motion-gated color transitions, without new
global palette changes, API calls, continuous animation or direct create/edit actions.
Verification: focused ESLint and one non-incremental TypeScript pass succeeded.
One contrast calculation pass checked 19 text/control token pairs per theme;
normal text reached at least 5.75:1 in light and 6.10:1 in dark, and checked
boundaries/focus indicators reached 3:1. In-memory helper checks covered future
selection, all-day/invalid dates, server LIVE, relative schedule wording and midnight
in the user's timezone. Static rendering covered a single timeline Up next marker,
meeting links/statuses, focus pending/error/zero/positive data and cached refresh
errors. The dynamic chart was stubbed for static rendering. Browser inventory is
empty, so live mobile/desktop light/dark, switching themes, keyboard, filters and
disclosure interactions remain unperformed. No package, test/script file or cache
configuration was added; no API/query changes were needed.
<!-- dashboard-context-polish:end -->

<!-- dashboard-panel-layout:start -->
## Dashboard balanced panel rows — 2026-10-18

The Dashboard now uses one row-based grid: My day / Upcoming meetings, My tasks /
Productivity, full-width Active projects, then Recent activity / Task activity.
Named container queries switch to two equal columns at 960px of available content,
independent of viewport width or sidebar state. Below that, the DOM reading order
stacks naturally. Gaps are consistently 24px; the previous asymmetric column
padding is removed. Panels stretch with their row without fixed content heights.

Today's focus time and completed sessions now share the Productivity panel with
the seven-day total, existing 240px chart and Daily totals disclosure. The unused
standalone Focus component is removed. One focus query/feedback group remains;
cached focus and task activity remain visible alongside a refresh error.
Active projects distribute only the existing one/two/three entries at 640px of
Dashboard content width. The heatmap scales up to 384px with square cells and
aligned weekday labels; expanding its totals grows the page without nested scrolling.
The auth-loading skeleton mirrors all seven panel positions and their container
breakpoint. Stat cards, weather/location preference, anchor targets, task filters,
Show more/fewer, links, APIs and query ownership remain unchanged.

Browser inventory is empty. Live 375/768/1366/1920px, sidebar, theme and interaction
checks cannot run. Focused ESLint and one non-incremental TypeScript pass succeeded.
An in-memory Tailwind compilation confirmed the named 960px container query,
equal columns, full-width project row and square heatmap cells. Static rendering of
the actual merged Productivity component covered pending, initial error, success,
cached refresh error and zero sessions, confirming one retry group and preserved
cached metrics. The dynamic chart was stubbed for that check; interactive filters,
Show more/fewer, charts and Daily totals were not browser-tested. No packages,
test/script files or cache configuration were added.
<!-- dashboard-panel-layout:end -->

<!-- dashboard-stat-weather:start -->
## Dashboard stat cards and local weather — 2026-10-18

The four summary links now compose the owned Card primitive, with neutral surfaces,
semantic icon tiles, consistent panel corners and 16px gaps. Existing one/two/four
column breakpoints, values, task-filter callbacks, error targets and navigation
remain intact. Dashboard loading uses the matching four-card grid.

The user selected real weather by location. The greeting now shows Open-Meteo
current Celsius temperature, WMO condition and provider day/night state with colorful
owned SVG illustrations. Separate sun/moon, mostly clear, partly cloudy, overcast,
fog/freezing fog, drizzle/freezing drizzle, rain/freezing rain/showers,
snow/grains/showers and thunder/hail silhouettes replace the eight generic symbols.
Precipitation density reflects reported intensity; cloud, water, ice and lightning
use separate light/dark colors with legible outlines. Unknown codes have a neutral
question-cloud fallback. WMO mapping includes code 97 (heavy thunderstorm) from
the current provider documentation. The time-based sun/cloud illustration
also gains color and is used only as fallback, with explicit Use location, loading,
blocked/unavailable or retry feedback. Provider attribution (Open-Meteo, CC BY 4.0)
is inside the interactive weather-details popover, without the standalone action
under the weather icon. The free endpoint is intended for this non-commercial thesis app.
Provider docs: https://open-meteo.com/en/docs and https://open-meteo.com/en/terms.

The Use location switch defaults off and saves only a browser-local boolean choice.
Turning it off cancels pending weather requests, clears coordinates/weather cache,
ignores late position callbacks and restores the clock illustration. Other tabs
observe preference changes; unavailable storage retains the choice for the current
page. Reopening the page does not re-enable a saved-off preference even when browser
permission remains granted. Turning it on explicitly requests location; auto-loading
requires both a saved-on preference and an existing granted browser permission.
Coordinates are rounded to two decimals, kept in memory, and
sent directly to Open-Meteo without app credentials or a referrer. They are not
saved to the account or local storage. Permission revocation clears the position
and disables fetching. React Query owns weather data, refreshing every 15 minutes
while visible and on stale window focus. Requests have timeout/cancellation and
runtime Zod validation; stale/error data is marked Previous weather. No default
city, IP geolocation, backend API, package, test/script file or cache setup added.

Verification: focused lint/type checks, in-memory parsing/invalid-coordinate/HTTP
failure and representative WMO mapping checks passed. A live read-only provider
request used test coordinates (0,0), not a user's location, and returned valid
current fields; a request with a test Origin confirmed `Access-Control-Allow-Origin:
*` for browser fetching. The initial sandbox network request failed, and the
network-enabled check succeeded. Browser inventory remains empty, so real permission
grant/denial/revocation and desktop/mobile light/dark visual checks remain unperformed.
Follow-up verification for the on/off control: focused ESLint and TypeScript passed;
in-memory default/off/on persistence, storage-unavailable fallback and notification
checks passed. Static rendering of the actual widget with enabled/disabled fixtures
confirmed switch state, hiding cached weather when off and no collapsed provider
action. Live browser toggling, permission dialogs and popover interactions remain
unperformed; no test/script files or packages were added.
Icon follow-up: focused ESLint and TypeScript passed. In-memory static rendering
covered all 29 supported WMO codes in day/night mode plus the unknown fallback.
A light/dark SVG contact sheet was inspected for silhouette, layer order and
precipitation clarity using existing rendering dependencies, without writing files.
This isolated preview does not replace browser layout/theme verification; no browser
is connected, so live desktop/mobile checks remain unperformed.
<!-- dashboard-stat-weather:end -->

<!-- meeting-overview-content:start -->
## Meetings Overview: next and recent meetings — 2026-10-18

Implements the approved two-section Overview plan beneath the existing four actions.
The first of three upcoming meetings reuses UpcomingMeetingCard and its existing
Start/Join, Calendar event, Edit, Copy and Cancel permission checks. The next two
remain informational rows in API order. View all opens Upcoming; Schedule opens
the existing modal. Four recent meetings use the existing history title helper,
status badge, avatar stack and copy-token control; View history opens Previous.

The content grid uses a 3:2 split at 900px of the meeting-content container and
stacks below it, without fixed panel heights or internal scroll regions. Existing
neutral/navy theme tokens, sidebar and primary actions remain in place. No recording
section or room UI changes are part of this pass.

The history hook accepts an optional limit (default remains nine). Overview uses
three upcoming/four recent records and disables its queries outside Overview or
while prejoin/creation overlays are open. The global QueryProvider disables window
focus refetch; optional hook settings enable it only for Overview. Existing socket
status/start, end, participant, host-transfer and reconnect callbacks invalidate
upcoming/history query roots, including the existing history summary. No new API,
backend behavior, polling timer, global query default or permission rule is added.

The existing 30-second clock drives relative labels. Live comes only from server
status; reaching the scheduled time displays Awaiting start. Each section has
separate pending/error/Retry/empty feedback. Cached rows survive refresh errors;
unknown counts do not become zero. Names and avatar colors remain user data.

Verification: ESLint on the eight feature files passed with zero errors/warnings;
TypeScript passed; nine focused in-memory time-label cases passed; one targeted
Impeccable detector pass exited successfully. No test/script files, dependency or
cache configuration were added. Browser inventory remains empty, so the requested
375px/768px/desktop light/dark visual checks and live Start/Join, Schedule/Edit,
Copy, focus refetch and socket interaction checks remain unperformed. Routing,
permission reuse, query gating and cached-content branches were inspected in source.
<!-- meeting-overview-content:end -->

<!-- meeting-visual-polish:start -->
## Meetings visual refinement — 2026-10-18

Preserves the current Meetings frame, sidebar, four-action grid, tabs, breakpoints,
dialogs, room controls and media layout. Refinement follows the existing neutral
light/charcoal dark tokens and navy primary action; no global theme values change.
The Google Meet homepage's start/join emphasis and Fluent 2's neutral surface and
card hierarchy guidance informed this pass:
https://support.google.com/meet/answer/17302648,
https://fluent2.microsoft.design/color,
https://fluent2.microsoft.design/components/web/react/core/card/usage/.

- Overview actions keep one navy primary; secondary icons use neutral surfaces.
  Selected navigation and pagination use the existing soft-selection pair.
- History/upcoming cards use consistent panel corners, readable title/date
  hierarchy and quieter metadata. History removes its decorative blue stripe and
  nested bordered footer; state badges compose the existing shared Badge adapter.
- Recordings, device fields, the join dialog, empty/loading states and button
  wrappers share the same neutral borders, corner scale and restrained hover/focus
  treatments. Device IDs reach the existing shared select trigger.
- Prejoin retains its full-screen preview/settings columns, while media placeholders
  use fixed neutral media tokens in both themes. Mic/camera-off remains soft red;
  room active states use the paired soft-selection tokens and Leave stays solid red.
- All API calls, permissions, callbacks, queries, meeting/recording state and
  user/media content remain unchanged. No tool, dependency or test/script file added.

Verification scope: focused ESLint for the 19 changed TSX files, TypeScript and
one Impeccable detector pass; 28 contrast calculations across light/dark text,
status, selection, focus/input and media pairs passed. No browser is connected
(`apps: [], browsers: []`), so desktop/mobile screenshots, live media/meeting
interactions and visual verification in both themes remain unperformed. Computed
token contrast is not a substitute for those browser checks.
<!-- meeting-visual-polish:end -->

<!-- seo-metadata:start -->
## Page metadata and indexing — 2026-10-18

All 17 server pages now declare generic English titles/descriptions through
`lib/seo.ts` and `lib/page-metadata.ts`. Interactive Projects and shared-document
rendering remain in client components. Workspace/auth group defaults and the
shared-document page are `noindex, nofollow`. Homepage can opt into indexing only
with a validated public HTTPS origin and an explicit production setting.

The user confirmed there is no production domain: indexing stays off, canonical
and absolute social URLs are omitted, and sitemap contains no URLs. Robots allows
crawlers to read noindex and advertises no sitemap in this configuration. No
authenticated fetch or user/project/document names, IDs, query values or meeting
tokens are used in head metadata. Homepage-only social fields cannot leak its
canonical into private routes. A generic 1200×630 navy PNG and branded W SVG icon
replace starter branding. Pomodoro title handling restores the current route's
title while preserving the running countdown and timer/session logic.

Docker and image-build workflow carry the same optional `SITE_URL` and default-off
`SITE_INDEXABLE` through build/runtime. Trial image builds force indexing off.
See `docs/seo-metadata.md` for configuration and immutable image constraints.

Verification: ESLint on 29 changed/new TS/TSX files passed with zero errors and
warnings; TypeScript passed. Production build passed after a network-enabled retry
to download the existing Inter font (the initial sandboxed build could not reach
Google Fonts). Ten focused in-memory configuration/copy checks covered default-off,
production opt-in, private routes, invalid origins and development restrictions.
A short-lived standalone server returned correct server HTML metadata for `/`,
`/login`, `/dashboard` and a shared-document route with a fake ID. Robots, empty
sitemap, branded icon and PNG content type/dimensions passed HTTP checks; the
generated social image was visually inspected. The server was stopped afterward.

No browser was connected (`apps: [], browsers: []`), so live client navigation,
Pomodoro pause/completion title behavior and desktop/mobile browser rendering were
not exercised. No test suite/script files, packages or cache configuration were
added; existing build output was used. No deployment or Search Console submission
was performed.
<!-- seo-metadata:end -->

<!-- web-ux-hardening:start -->
## Cross-module UX hardening — 2026-10-18

Implements the approved critique follow-up across the entire web frontend. The inventory below supersedes earlier counts in this historical audit. The navy/neutral palette, stored custom colors, media/document contents, backend APIs, permissions, authentication and saved-theme application remain unchanged. Pomodoro continues to exclude overdue tasks by the user's explicit choice.

### Requirement and implementation coverage

| Approved requirement | Implemented source evidence |
| --- | --- |
| Keyboard-operable actions | Channel/DM primary buttons are siblings of overflow actions; space selection, profile actions, polls, version upload, notification renderers, task property/title/description editing and document opening use owned controls. Poll choices use native adapters with radio/checkbox semantics. Task drag surfaces guard keyboard bubbling from child controls. |
| Named forms and validation | Shared Settings fields generate IDs and connect labels, descriptions and errors. Rich-text fields accept accessible naming props; poll options and search/edit fields are named. Auth fields have matching labels, autocomplete, required constraints and validation focus. OTP cells expose digit positions/error descriptions and accept full-code autofill. |
| Mobile navigation and overlays | Workspace and Project navigation, Calendar navigation, Chat detail/thread panels and narrow Documents Details use SheetPanel with modal lifecycle only at their actual breakpoint. Closed panels are inert. Shared modal handling follows opening order, restores focus and retains reference-counted scroll locking; the old Project sidebar lock/Escape effect was removed. |
| Popup relationships | Controlled menu/popover triggers expose expanded state, popup kind and stable IDs. Owned adapters provide a compatibility relationship for existing triggers; context-menu rectangles remain supported. Mention options have listbox/option semantics, an active descendant and keyboard scrolling without taking composer focus. |
| Accurate async states | Shared QueryFeedback provides pending/error/Retry feedback without owning feature data. Account, Preferences, Security, Password, Calendar, Documents explorer/versions/folder picker, Notifications and Chat thread/search/file/note/poll/pin views distinguish failures from genuine empty results. Existing content is retained where a refresh fails. Version upload errors show an error icon/status rather than a spinner. |
| Settings draft lifecycle | Account, Preferences and Pomodoro panes retain drafts while changing sections. Query updates do not replace dirty fields. Closing offers Save changes / Discard / Keep editing; saves run Account → Preferences → Pomodoro, stop on failure and expose the failed pane. Password/OTP inputs are discarded on leaving their pane, with a warning when dirty. Closing or changing account destroys the draft session. No browser/Redux persistence was added. |
| Trustworthy action feedback | Shared-document link copy awaits clipboard success and offers selectable text on failure. File download failures are visible. AI navigation is labeled Coming soon; public acquisition copy describes working connections. Public shared-document text is English, and sign-in preserves the safe document return path. Public rename composes the owned document input dialog. |
| Discovery and density | Documents implements Ctrl/Cmd+K for visible search outside editing/modal contexts. Help & shortcuts is available from the user menu. Project assignee shortcuts are grouped under disclosure without changing query semantics. Read filters, view switches and media toggles expose their actual selected/pressed state. Pomodoro explains eligibility and links back to the task source. |
| Pointer/touch states | Owned buttons and tab triggers provide a 44px minimum target for coarse pointers. Hover-revealed actions are also exposed on focus and devices without hover. Chat message actions remain inside the narrow layout; search/password input spacing reserves room for larger action targets. |
| Regression boundary | The local shared-ui ESLint rule additionally rejects unexplained click-only nonsemantic controls. Existing native-input, vendor-DOM and drag ownership exceptions are retained. No dependency, backend, API module or theme-token changes were required. |

### Current source inventory

All **431 TSX sources** were included in the final read-only AST screen. This is source coverage, not certification that every rendering branch or device was exercised.

| Area | TSX |
| --- | ---: |
| App routes/layouts/public | 27 |
| Shared common/layout/UI | 45 |
| Auth | 4 |
| Calendar | 35 |
| Chat | 90 |
| Dashboard | 12 |
| Documents | 39 |
| Meetings | 71 |
| Notifications | 16 |
| Pomodoro | 28 |
| Projects | 51 |
| User settings | 11 |
| Store providers | 2 |
| **Total** | **431** |

The three additional TSX sources since critique are the common QueryFeedback, WorkspaceHelpDialog and Settings draft context/hook. The media/container-query hooks are owned UI TypeScript helpers. The prior consolidation inventory also omitted the two pre-existing store providers; they are counted here.

### Intentional interaction exceptions

Thirteen source boundaries carry an explicit data-ui-interaction-exception reason. They do not create an alternative base control:

- Workspace backdrop; notification-detail backdrop; followed-thread backdrop; media-lightbox backdrop: pointer dismissal with a named close control and Escape supplied by the modal lifecycle.
- Followed-thread content, media-lightbox toolbar and image: stop propagation or preserve media dragging without adding a second action.
- Search-result row: pointer delegation has a named shared Open message button; formatted links remain independently operable, outside that button.
- Compact focus action and task priority wrapper: prevent the parent task card from activating; contained owned controls handle keyboard interaction.
- Hidden-label tooltip trigger: focusable information trigger; its click handler only prevents parent activation.
- Project calendar drag chip: dnd-kit owns keyboard attributes and an explicit Enter/Space handler opens the task.
- Backlog inline-creation container: propagation boundary around owned form controls.

Hidden file inputs, the intentionally native OTP cells, rich/document/media content, library-generated DOM and specialized drag structures retain the earlier ownership exceptions.

### Bounded verification and limitations

- TypeScript: noEmit with incremental disabled passed. No package, test suite, test file, server or cache setup was added.
- Focused ESLint: **140 changed/new TS/TSX/MJS files**, **138 existing errors / 44 existing warnings**, **zero added diagnostics** against HEAD after normalizing diagnostic locations; **zero shared-ui violations**. Unrelated existing React Compiler/hook and other baseline findings remain.
- Final AST screen: 431 TSX parsed; zero syntax diagnostics, unexplained click-only candidates, unnamed direct Input/Textarea/NativeSelect candidates or statically nested controls. Wrapped fields, spread props and third-party/composed output still require runtime inspection; screening does not prove their rendered behavior.
- Eight in-memory ESLint policy fixtures passed: raw buttons/vendor imports/click-only or incomplete keyboard controls are rejected; owned controls, explicit boundaries, keyboard drag surfaces and hidden file inputs are accepted. No fixture files were written.
- One final full-target detector pass returned one side-tab warning at chat/utils/message-formatter.tsx:441. It is the existing neutral semantic blockquote border, an intentional false positive. No decorative recoloring or quote-border removal was applied.
- A fresh browser inventory returned apps=[] and browsers=[]. Desktop/mobile, both themes, 200% zoom, live Tab/Escape/focus restoration, screen-reader output, touch, uploads, drag-and-drop and media/device checks could not be run. No screenshot, overlay or end-to-end success is claimed.
- No current full-web critique snapshot existed for polish to close. This audit records the implementation and limits directly.

<!-- web-ux-hardening:end -->

<!-- shared-base-ui:start -->
## Shared base UI consolidation - 2026-10-18

Preserves the approved layout, navy/neutral themes, native form/ref/event contracts, custom colors, permissions and feature state. Scope includes workspace modules, shared navigation, authentication and public document pages.

- Migration baseline: 415 TSX sources, including 25 owned UI files. Replaced 363 native buttons, 26 ordinary inputs, 11 checkboxes, one radio, four textareas and eight selects outside the shared layer. Four application tables and their row/cell renderers now compose the owned Table family. Native adapters retain browser ChangeEvent/ref/peer semantics; the styled Radix controls remain available.
- Compatibility styling: Button variant=unstyled and the unstyled Input/Textarea/Table/TabsTrigger options retain existing feature classes and SVG dimensions while centralizing interaction semantics. Domain wrappers remain where they add meaning; repeated search and document icon-button implementations compose SearchInput/IconButton.
- Added owned DropdownMenu, ContextMenu, Combobox, RadioGroup, Sheet/SheetPanel, Avatar, Progress, IconButton, SearchInput and NativeSelect. Controlled row/editor menus use AnchoredMenu/AnchoredPopover adapters backed by existing dependencies. Remote share and location suggestions use Combobox without changing lookup/debounce/submission logic. No dependency or package manifest changes.
- DialogSurface owns portals and the modal lifecycle for existing custom compositions; normal dialogs use DialogContent. Removed duplicate feature modal hooks. AlertDialog has alertdialog semantics. Tooltip uses the installed primitive for trigger association, focus/hover and portal positioning. Dialog focus trapping recognizes menu/combobox/popover portals and avoids restoring focus over a newly opened modal.
- Project task details use Sheet. Calendar's hybrid drawer uses SheetPanel: container-query positioning stays in-flow, while a ResizeObserver on the actual calendar canvas enables modal focus/scroll handling below 1040px. True detail/list panels use Tabs; project/notification filters and view-mode/form-kind switches remain button groups. CustomTabs keeps its existing API/name as a filter-group compatibility wrapper.
- The local ESLint shared-ui rule blocks native base controls, direct vendor-primitive imports and createPortal imports outside the owned UI layer. Exceptions are nine hidden file inputs and the OTP cell input. Semantic labels, links, layout/content, browser media, rich-text/mention behavior, the functional timer ring, drag/virtualized structures, and library-generated FullCalendar/Recharts/LiveKit/emoji DOM are not replaced with decorative wrappers.
- Validation: TypeScript passed with noEmit and incremental disabled after resolving adapter integration errors. ESLint checked 198 changed/new TS/TSX/MJS files: 151 existing errors and 51 existing warnings, zero added diagnostics against HEAD after normalizing diagnostic locations; zero shared-ui boundary violations. A focused scan of shared components returned no detector findings; in-memory policy checks confirmed raw buttons are rejected and hidden file inputs are allowed. Source inventory found zero unclassified native base controls or feature createPortal imports.
- Browser inventory returned no apps/browsers. Runtime desktop/mobile, theme, keyboard, touch, drag-and-drop, upload and device checks could not run. Source coverage is not rendered-state certification. No test suite, packages, server, temporary test files or cache setup were added.

### Source coverage at base consolidation

At consolidation, 426 TSX files are classified below: 36 owned UI, 263 direct consumers, 73 consumers through composition, and 54 content/layout/provider sources. Import-graph classification documents ownership; it does not assert every branch was rendered. The 10 allowed native inputs are listed separately.

| Module | TSX files | Owned UI | Direct | Composed | Content/layout/provider |
| --- | ---: | ---: | ---: | ---: | ---: |
| app | 27 | 0 | 3 | 15 | 9 |
| components | 43 | 36 | 5 | 0 | 2 |
| auth | 4 | 0 | 4 | 0 | 0 |
| calendar | 35 | 0 | 30 | 4 | 1 |
| chat | 90 | 0 | 72 | 9 | 9 |
| dashboard | 12 | 0 | 6 | 4 | 2 |
| documents | 39 | 0 | 27 | 5 | 7 |
| meeting | 71 | 0 | 34 | 29 | 8 |
| notification | 16 | 0 | 10 | 0 | 6 |
| pomodoro | 28 | 0 | 26 | 0 | 2 |
| project | 51 | 0 | 37 | 7 | 7 |
| user-setting | 10 | 0 | 9 | 0 | 1 |

### Explicit native-input exceptions

| Source | Reason |
| --- | --- |
| [features/calendar/components/modal/calendar-documents-section.tsx:123](../frontend/web/features/calendar/components/modal/calendar-documents-section.tsx#L123) | Hidden native file picker |
| [features/chat/components/input/channel-chat-input.tsx:805](../frontend/web/features/chat/components/input/channel-chat-input.tsx#L805) | Hidden native file picker |
| [features/chat/components/input/direct-message-input.tsx:595](../frontend/web/features/chat/components/input/direct-message-input.tsx#L595) | Hidden native file picker |
| [features/chat/components/input/thread-chat-input.tsx:659](../frontend/web/features/chat/components/input/thread-chat-input.tsx#L659) | Hidden native file picker |
| [features/documents/components/explorer/explorer-toolbar.tsx:152](../frontend/web/features/documents/components/explorer/explorer-toolbar.tsx#L152) | Hidden native file picker |
| [features/documents/components/versions/version-uploader.tsx:35](../frontend/web/features/documents/components/versions/version-uploader.tsx#L35) | Hidden native file picker |
| [features/meeting/components/room/message/meeting-message-input.tsx:289](../frontend/web/features/meeting/components/room/message/meeting-message-input.tsx#L289) | Hidden native file picker |
| [features/project/components/task-detail/task-documents-section.tsx:156](../frontend/web/features/project/components/task-detail/task-documents-section.tsx#L156) | Hidden native file picker |
| [features/user-setting/components/profile-tab.tsx:154](../frontend/web/features/user-setting/components/profile-tab.tsx#L154) | Hidden native file picker |
| [components/common/otp-input.tsx:86](../frontend/web/components/common/otp-input.tsx#L86) | OTP cell selection/paste/focus contract |

### Component inventory

| Source | Ownership | Disposition |
| --- | --- | --- |
| [app/(auth)/forgot-password/page.tsx](../frontend/web/app/(auth)/forgot-password/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(auth)/layout.tsx](../frontend/web/app/(auth)/layout.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(auth)/login/page.tsx](../frontend/web/app/(auth)/login/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(auth)/register/page.tsx](../frontend/web/app/(auth)/register/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(public)/documents/shared/[id]/components/shared-denied.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-denied.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(public)/documents/shared/[id]/components/shared-details.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-details.tsx) | direct | Imports shared UI |
| [app/(public)/documents/shared/[id]/components/shared-folder-browser.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-folder-browser.tsx) | direct | Imports shared UI |
| [app/(public)/documents/shared/[id]/components/shared-header.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-header.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(public)/documents/shared/[id]/components/shared-preview.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-preview.tsx) | composed | Composes a shared-UI consumer |
| [app/(public)/documents/shared/[id]/page.tsx](../frontend/web/app/(public)/documents/shared/[id]/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(public)/layout.tsx](../frontend/web/app/(public)/layout.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(public)/page.tsx](../frontend/web/app/(public)/page.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(workspace)/ai/page.tsx](../frontend/web/app/(workspace)/ai/page.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(workspace)/calendar/page.tsx](../frontend/web/app/(workspace)/calendar/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/chat/page.tsx](../frontend/web/app/(workspace)/chat/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/dashboard/page.tsx](../frontend/web/app/(workspace)/dashboard/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/documents/page.tsx](../frontend/web/app/(workspace)/documents/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/layout.tsx](../frontend/web/app/(workspace)/layout.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/meetings/[joinToken]/page.tsx](../frontend/web/app/(workspace)/meetings/[joinToken]/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/meetings/page.tsx](../frontend/web/app/(workspace)/meetings/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/pomodoro/page.tsx](../frontend/web/app/(workspace)/pomodoro/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/projects/[id]/page.tsx](../frontend/web/app/(workspace)/projects/[id]/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/projects/invitations/page.tsx](../frontend/web/app/(workspace)/projects/invitations/page.tsx) | composed | Composes a shared-UI consumer |
| [app/(workspace)/projects/layout.tsx](../frontend/web/app/(workspace)/projects/layout.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/(workspace)/projects/page.tsx](../frontend/web/app/(workspace)/projects/page.tsx) | direct | Imports shared UI |
| [app/(workspace)/tasks/page.tsx](../frontend/web/app/(workspace)/tasks/page.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [app/layout.tsx](../frontend/web/app/layout.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [components/common/input-field.tsx](../frontend/web/components/common/input-field.tsx) | direct | Imports shared UI |
| [components/common/notification-dropdown.tsx](../frontend/web/components/common/notification-dropdown.tsx) | direct | Imports shared UI |
| [components/common/otp-input.tsx](../frontend/web/components/common/otp-input.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls; OTP cell selection/paste/focus contract |
| [components/common/theme-provider.tsx](../frontend/web/components/common/theme-provider.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [components/common/user-profile-dropdown.tsx](../frontend/web/components/common/user-profile-dropdown.tsx) | direct | Imports shared UI |
| [components/layout/workspace-header.tsx](../frontend/web/components/layout/workspace-header.tsx) | direct | Imports shared UI |
| [components/layout/workspace-shell.tsx](../frontend/web/components/layout/workspace-shell.tsx) | direct | Imports shared UI |
| [components/ui/alert-dialog.tsx](../frontend/web/components/ui/alert-dialog.tsx) | core | Owned primitive/adapter |
| [components/ui/anchored-popup.tsx](../frontend/web/components/ui/anchored-popup.tsx) | core | Owned primitive/adapter |
| [components/ui/avatar.tsx](../frontend/web/components/ui/avatar.tsx) | core | Owned primitive/adapter |
| [components/ui/badge.tsx](../frontend/web/components/ui/badge.tsx) | core | Owned primitive/adapter |
| [components/ui/breadcrumb.tsx](../frontend/web/components/ui/breadcrumb.tsx) | core | Owned primitive/adapter |
| [components/ui/button.tsx](../frontend/web/components/ui/button.tsx) | core | Owned primitive/adapter |
| [components/ui/card.tsx](../frontend/web/components/ui/card.tsx) | core | Owned primitive/adapter |
| [components/ui/checkbox.tsx](../frontend/web/components/ui/checkbox.tsx) | core | Owned primitive/adapter |
| [components/ui/combobox.tsx](../frontend/web/components/ui/combobox.tsx) | core | Owned primitive/adapter |
| [components/ui/context-menu.tsx](../frontend/web/components/ui/context-menu.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/custom-badge.tsx](../frontend/web/components/ui/custom/custom-badge.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/custom-checkbox.tsx](../frontend/web/components/ui/custom/custom-checkbox.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/custom-date-range.tsx](../frontend/web/components/ui/custom/custom-date-range.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/custom-select.tsx](../frontend/web/components/ui/custom/custom-select.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/custom-tabs.tsx](../frontend/web/components/ui/custom/custom-tabs.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/custom-tag.tsx](../frontend/web/components/ui/custom/custom-tag.tsx) | core | Owned primitive/adapter |
| [components/ui/custom/simple-pagination.tsx](../frontend/web/components/ui/custom/simple-pagination.tsx) | core | Owned primitive/adapter |
| [components/ui/dialog.tsx](../frontend/web/components/ui/dialog.tsx) | core | Owned primitive/adapter |
| [components/ui/dropdown-menu.tsx](../frontend/web/components/ui/dropdown-menu.tsx) | core | Owned primitive/adapter |
| [components/ui/icon-button.tsx](../frontend/web/components/ui/icon-button.tsx) | core | Owned primitive/adapter |
| [components/ui/input.tsx](../frontend/web/components/ui/input.tsx) | core | Owned primitive/adapter |
| [components/ui/native-select.tsx](../frontend/web/components/ui/native-select.tsx) | core | Owned primitive/adapter |
| [components/ui/popover.tsx](../frontend/web/components/ui/popover.tsx) | core | Owned primitive/adapter |
| [components/ui/progress.tsx](../frontend/web/components/ui/progress.tsx) | core | Owned primitive/adapter |
| [components/ui/radio-group.tsx](../frontend/web/components/ui/radio-group.tsx) | core | Owned primitive/adapter |
| [components/ui/search-input.tsx](../frontend/web/components/ui/search-input.tsx) | core | Owned primitive/adapter |
| [components/ui/select.tsx](../frontend/web/components/ui/select.tsx) | core | Owned primitive/adapter |
| [components/ui/separator.tsx](../frontend/web/components/ui/separator.tsx) | core | Owned primitive/adapter |
| [components/ui/sheet.tsx](../frontend/web/components/ui/sheet.tsx) | core | Owned primitive/adapter |
| [components/ui/skeleton.tsx](../frontend/web/components/ui/skeleton.tsx) | core | Owned primitive/adapter |
| [components/ui/slider.tsx](../frontend/web/components/ui/slider.tsx) | core | Owned primitive/adapter |
| [components/ui/switch.tsx](../frontend/web/components/ui/switch.tsx) | core | Owned primitive/adapter |
| [components/ui/table.tsx](../frontend/web/components/ui/table.tsx) | core | Owned primitive/adapter |
| [components/ui/tabs.tsx](../frontend/web/components/ui/tabs.tsx) | core | Owned primitive/adapter |
| [components/ui/textarea.tsx](../frontend/web/components/ui/textarea.tsx) | core | Owned primitive/adapter |
| [components/ui/tooltip.tsx](../frontend/web/components/ui/tooltip.tsx) | core | Owned primitive/adapter |
| [features/auth/components/forgot-password-form.tsx](../frontend/web/features/auth/components/forgot-password-form.tsx) | direct | Imports shared UI |
| [features/auth/components/login-form.tsx](../frontend/web/features/auth/components/login-form.tsx) | direct | Imports shared UI |
| [features/auth/components/register-form.tsx](../frontend/web/features/auth/components/register-form.tsx) | direct | Imports shared UI |
| [features/auth/components/social-login-buttons.tsx](../frontend/web/features/auth/components/social-login-buttons.tsx) | direct | Imports shared UI |
| [features/calendar/components/drawer/calendar-task-list.tsx](../frontend/web/features/calendar/components/drawer/calendar-task-list.tsx) | direct | Imports shared UI |
| [features/calendar/components/drawer/calendar-tasks-drawer.tsx](../frontend/web/features/calendar/components/drawer/calendar-tasks-drawer.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/attachment-editor.tsx](../frontend/web/features/calendar/components/modal/attachment-editor.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/calendar-conference-card.tsx](../frontend/web/features/calendar/components/modal/calendar-conference-card.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/calendar-document-picker-dialog.tsx](../frontend/web/features/calendar/components/modal/calendar-document-picker-dialog.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/calendar-documents-section.tsx](../frontend/web/features/calendar/components/modal/calendar-documents-section.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/calendar/components/modal/calendar-modal.tsx](../frontend/web/features/calendar/components/modal/calendar-modal.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/calendar-select.tsx](../frontend/web/features/calendar/components/modal/calendar-select.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/calendar-task-deadline-fields.tsx](../frontend/web/features/calendar/components/modal/calendar-task-deadline-fields.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/calendar-time-fields.tsx](../frontend/web/features/calendar/components/modal/calendar-time-fields.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/custom-recurrence-modal.tsx](../frontend/web/features/calendar/components/modal/custom-recurrence-modal.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/delete-calendar-modal.tsx](../frontend/web/features/calendar/components/modal/delete-calendar-modal.tsx) | composed | Composes a shared-UI consumer |
| [features/calendar/components/modal/event-attendee-list.tsx](../frontend/web/features/calendar/components/modal/event-attendee-list.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/calendar/components/modal/event-detail-modal.tsx](../frontend/web/features/calendar/components/modal/event-detail-modal.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/event-form-modal.tsx](../frontend/web/features/calendar/components/modal/event-form-modal.tsx) | composed | Composes a shared-UI consumer |
| [features/calendar/components/modal/location-picker-input.tsx](../frontend/web/features/calendar/components/modal/location-picker-input.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/project-task-detail-modal.tsx](../frontend/web/features/calendar/components/modal/project-task-detail-modal.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/quick-create-event-fields.tsx](../frontend/web/features/calendar/components/modal/quick-create-event-fields.tsx) | composed | Composes a shared-UI consumer |
| [features/calendar/components/modal/quick-create-modal.tsx](../frontend/web/features/calendar/components/modal/quick-create-modal.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/quick-create-time-section.tsx](../frontend/web/features/calendar/components/modal/quick-create-time-section.tsx) | composed | Composes a shared-UI consumer |
| [features/calendar/components/modal/recurrence-scope-modal.tsx](../frontend/web/features/calendar/components/modal/recurrence-scope-modal.tsx) | direct | Imports shared UI |
| [features/calendar/components/modal/reminder-editor.tsx](../frontend/web/features/calendar/components/modal/reminder-editor.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/calendar-color-popover.tsx](../frontend/web/features/calendar/components/sidebar/calendar-color-popover.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/calendar-list-item.tsx](../frontend/web/features/calendar/components/sidebar/calendar-list-item.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/calendar-sidebar.tsx](../frontend/web/features/calendar/components/sidebar/calendar-sidebar.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/calendar-style-fields.tsx](../frontend/web/features/calendar/components/sidebar/calendar-style-fields.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/mini-calendar.tsx](../frontend/web/features/calendar/components/sidebar/mini-calendar.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/project-calendars-section.tsx](../frontend/web/features/calendar/components/sidebar/project-calendars-section.tsx) | direct | Imports shared UI |
| [features/calendar/components/sidebar/tasks-calendar-list-item.tsx](../frontend/web/features/calendar/components/sidebar/tasks-calendar-list-item.tsx) | direct | Imports shared UI |
| [features/calendar/components/toolbar/calendar-toolbar.tsx](../frontend/web/features/calendar/components/toolbar/calendar-toolbar.tsx) | direct | Imports shared UI |
| [features/calendar/components/ui/calendar-confirm-dialog.tsx](../frontend/web/features/calendar/components/ui/calendar-confirm-dialog.tsx) | direct | Imports shared UI |
| [features/calendar/components/ui/calendar-radio-group.tsx](../frontend/web/features/calendar/components/ui/calendar-radio-group.tsx) | direct | Imports shared UI |
| [features/calendar/components/workspace/attendee-picker.tsx](../frontend/web/features/calendar/components/workspace/attendee-picker.tsx) | direct | Imports shared UI |
| [features/calendar/components/workspace/calendar-grid.tsx](../frontend/web/features/calendar/components/workspace/calendar-grid.tsx) | direct | Imports shared UI |
| [features/calendar/components/workspace/calendar-workspace.tsx](../frontend/web/features/calendar/components/workspace/calendar-workspace.tsx) | direct | Imports shared UI |
| [features/chat/components/chat-area/chat-area.tsx](../frontend/web/features/chat/components/chat-area/chat-area.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/chat-area/editing-banner.tsx](../frontend/web/features/chat/components/chat-area/editing-banner.tsx) | direct | Imports shared UI |
| [features/chat/components/chat-area/jump-to-recent-banner.tsx](../frontend/web/features/chat/components/chat-area/jump-to-recent-banner.tsx) | direct | Imports shared UI |
| [features/chat/components/chat-layout.tsx](../frontend/web/features/chat/components/chat-layout.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/header/channel-chat-header.tsx](../frontend/web/features/chat/components/header/channel-chat-header.tsx) | direct | Imports shared UI |
| [features/chat/components/header/chat-header.tsx](../frontend/web/features/chat/components/header/chat-header.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/header/direct-conversation-header.tsx](../frontend/web/features/chat/components/header/direct-conversation-header.tsx) | direct | Imports shared UI |
| [features/chat/components/input/channel-chat-input.tsx](../frontend/web/features/chat/components/input/channel-chat-input.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/chat/components/input/direct-message-input.tsx](../frontend/web/features/chat/components/input/direct-message-input.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/chat/components/input/emoji-picker-popover.tsx](../frontend/web/features/chat/components/input/emoji-picker-popover.tsx) | direct | Imports shared UI |
| [features/chat/components/input/mention-dropdown.tsx](../frontend/web/features/chat/components/input/mention-dropdown.tsx) | direct | Imports shared UI |
| [features/chat/components/input/rich-text-textarea.tsx](../frontend/web/features/chat/components/input/rich-text-textarea.tsx) | direct | Imports shared UI |
| [features/chat/components/input/thread-chat-input.tsx](../frontend/web/features/chat/components/input/thread-chat-input.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/chat/components/message/chat-message.tsx](../frontend/web/features/chat/components/message/chat-message.tsx) | direct | Imports shared UI |
| [features/chat/components/message/document-message.tsx](../frontend/web/features/chat/components/message/document-message.tsx) | direct | Imports shared UI |
| [features/chat/components/message/media-lightbox.tsx](../frontend/web/features/chat/components/message/media-lightbox.tsx) | direct | Imports shared UI |
| [features/chat/components/message/meeting-card-message.tsx](../frontend/web/features/chat/components/message/meeting-card-message.tsx) | direct | Imports shared UI |
| [features/chat/components/message/message-attachments.tsx](../frontend/web/features/chat/components/message/message-attachments.tsx) | direct | Imports shared UI |
| [features/chat/components/message/message-avatar.tsx](../frontend/web/features/chat/components/message/message-avatar.tsx) | direct | Imports shared UI |
| [features/chat/components/message/message-list.tsx](../frontend/web/features/chat/components/message/message-list.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/message/message-options-dropdown.tsx](../frontend/web/features/chat/components/message/message-options-dropdown.tsx) | direct | Imports shared UI |
| [features/chat/components/message/message-reactions.tsx](../frontend/web/features/chat/components/message/message-reactions.tsx) | direct | Imports shared UI |
| [features/chat/components/message/message-read-receipts.tsx](../frontend/web/features/chat/components/message/message-read-receipts.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/components/message/note-message.tsx](../frontend/web/features/chat/components/message/note-message.tsx) | direct | Imports shared UI |
| [features/chat/components/message/poll-message.tsx](../frontend/web/features/chat/components/message/poll-message.tsx) | direct | Imports shared UI |
| [features/chat/components/message/task-card-message.tsx](../frontend/web/features/chat/components/message/task-card-message.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/components/message/time-divider.tsx](../frontend/web/features/chat/components/message/time-divider.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/components/message/typing-indicator.tsx](../frontend/web/features/chat/components/message/typing-indicator.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/components/modals/channel/browse-channels-modal.tsx](../frontend/web/features/chat/components/modals/channel/browse-channels-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/channel/channel-member-row.tsx](../frontend/web/features/chat/components/modals/channel/channel-member-row.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/channel/channel-members-list.tsx](../frontend/web/features/chat/components/modals/channel/channel-members-list.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/modals/channel/channel-members-modal.tsx](../frontend/web/features/chat/components/modals/channel/channel-members-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/channel/channel-settings-modal.tsx](../frontend/web/features/chat/components/modals/channel/channel-settings-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/channel/create-channel-modal.tsx](../frontend/web/features/chat/components/modals/channel/create-channel-modal.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/modals/message/create-note-modal.tsx](../frontend/web/features/chat/components/modals/message/create-note-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/create-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/create-poll-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/edit-note-modal.tsx](../frontend/web/features/chat/components/modals/message/edit-note-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/edit-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/edit-poll-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/poll-voters-modal.tsx](../frontend/web/features/chat/components/modals/message/poll-voters-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/reaction-detail-modal.tsx](../frontend/web/features/chat/components/modals/message/reaction-detail-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/view-note-modal.tsx](../frontend/web/features/chat/components/modals/message/view-note-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/message/view-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/view-poll-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/shared/my-files-select-modal.tsx](../frontend/web/features/chat/components/modals/shared/my-files-select-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/shared/search-user-modal.tsx](../frontend/web/features/chat/components/modals/shared/search-user-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/shared/user-profile-modal.tsx](../frontend/web/features/chat/components/modals/shared/user-profile-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/create-space-modal.tsx](../frontend/web/features/chat/components/modals/space/create-space-modal.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/modals/space/invite-space-members-modal.tsx](../frontend/web/features/chat/components/modals/space/invite-space-members-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/manage-members-modal.tsx](../frontend/web/features/chat/components/modals/space/manage-members-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/space-settings-modal.tsx](../frontend/web/features/chat/components/modals/space/space-settings-modal.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/modals/space/space-settings/danger-zone-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/danger-zone-tab.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/space-settings/invitations-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/invitations-tab.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/space-settings/members-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/members-tab.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/space-settings/overview-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/overview-tab.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/space-settings/permissions-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/permissions-tab.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/space/space-settings/space-settings-modal.tsx](../frontend/web/features/chat/components/modals/space/space-settings/space-settings-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/modals/start-meeting-confirm-modal.tsx](../frontend/web/features/chat/components/modals/start-meeting-confirm-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/channel/channel-actions-section.tsx](../frontend/web/features/chat/components/right-panel/channel/channel-actions-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/channel/channel-right-panel.tsx](../frontend/web/features/chat/components/right-panel/channel/channel-right-panel.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/channel/channel-settings-section.tsx](../frontend/web/features/chat/components/right-panel/channel/channel-settings-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/chat-right-panel.tsx](../frontend/web/features/chat/components/right-panel/chat-right-panel.tsx) | composed | Composes a shared-UI consumer |
| [features/chat/components/right-panel/direct-message/direct-message-right-panel.tsx](../frontend/web/features/chat/components/right-panel/direct-message/direct-message-right-panel.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/files/files-section.tsx](../frontend/web/features/chat/components/right-panel/files/files-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/files/media-detail-view.tsx](../frontend/web/features/chat/components/right-panel/files/media-detail-view.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/notes/note-detail-view.tsx](../frontend/web/features/chat/components/right-panel/notes/note-detail-view.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/notes/notes-section.tsx](../frontend/web/features/chat/components/right-panel/notes/notes-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx](../frontend/web/features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/pinned-messages/pinned-messages-section.tsx](../frontend/web/features/chat/components/right-panel/pinned-messages/pinned-messages-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/polls/poll-detail-view.tsx](../frontend/web/features/chat/components/right-panel/polls/poll-detail-view.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/polls/polls-section.tsx](../frontend/web/features/chat/components/right-panel/polls/polls-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/search/search-messages-section.tsx](../frontend/web/features/chat/components/right-panel/search/search-messages-section.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/search/search-result-item.tsx](../frontend/web/features/chat/components/right-panel/search/search-result-item.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/components/right-panel/see-all-button.tsx](../frontend/web/features/chat/components/right-panel/see-all-button.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/thread/thread-detail-view.tsx](../frontend/web/features/chat/components/right-panel/thread/thread-detail-view.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/thread/thread-side-panel.tsx](../frontend/web/features/chat/components/right-panel/thread/thread-side-panel.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/thread/thread-snippet-preview.tsx](../frontend/web/features/chat/components/right-panel/thread/thread-snippet-preview.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/components/right-panel/thread/threads-list-view.tsx](../frontend/web/features/chat/components/right-panel/thread/threads-list-view.tsx) | direct | Imports shared UI |
| [features/chat/components/right-panel/thread/threads-section.tsx](../frontend/web/features/chat/components/right-panel/thread/threads-section.tsx) | direct | Imports shared UI |
| [features/chat/components/sidebar/channel-item.tsx](../frontend/web/features/chat/components/sidebar/channel-item.tsx) | direct | Imports shared UI |
| [features/chat/components/sidebar/chat-sidebar.tsx](../frontend/web/features/chat/components/sidebar/chat-sidebar.tsx) | direct | Imports shared UI |
| [features/chat/components/sidebar/direct-conversation-item.tsx](../frontend/web/features/chat/components/sidebar/direct-conversation-item.tsx) | direct | Imports shared UI |
| [features/chat/components/sidebar/direct-conversations-section.tsx](../frontend/web/features/chat/components/sidebar/direct-conversations-section.tsx) | direct | Imports shared UI |
| [features/chat/components/sidebar/followed-threads-modal.tsx](../frontend/web/features/chat/components/sidebar/followed-threads-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/ui/chat-confirm-dialog.tsx](../frontend/web/features/chat/components/ui/chat-confirm-dialog.tsx) | direct | Imports shared UI |
| [features/chat/components/ui/chat-empty-state.tsx](../frontend/web/features/chat/components/ui/chat-empty-state.tsx) | direct | Imports shared UI |
| [features/chat/components/ui/chat-form-controls.tsx](../frontend/web/features/chat/components/ui/chat-form-controls.tsx) | direct | Imports shared UI |
| [features/chat/components/ui/chat-input-modal.tsx](../frontend/web/features/chat/components/ui/chat-input-modal.tsx) | direct | Imports shared UI |
| [features/chat/components/ui/chat-loading-state.tsx](../frontend/web/features/chat/components/ui/chat-loading-state.tsx) | direct | Imports shared UI |
| [features/chat/utils/document-utils.tsx](../frontend/web/features/chat/utils/document-utils.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/utils/media-utils.tsx](../frontend/web/features/chat/utils/media-utils.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/chat/utils/message-formatter.tsx](../frontend/web/features/chat/utils/message-formatter.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/dashboard/components/overview/dashboard-extras.tsx](../frontend/web/features/dashboard/components/overview/dashboard-extras.tsx) | direct | Imports shared UI |
| [features/dashboard/components/dashboard-focus.tsx](../frontend/web/features/dashboard/components/dashboard-focus.tsx) | composed | Composes a shared-UI consumer |
| [features/dashboard/components/overview/dashboard-meetings.tsx](../frontend/web/features/dashboard/components/overview/dashboard-meetings.tsx) | composed | Composes a shared-UI consumer |
| [features/dashboard/components/overview/dashboard-notification-dialog.tsx](../frontend/web/features/dashboard/components/overview/dashboard-notification-dialog.tsx) | direct | Imports shared UI |
| [features/dashboard/components/common/dashboard-panel.tsx](../frontend/web/features/dashboard/components/common/dashboard-panel.tsx) | direct | Imports shared UI |
| [features/dashboard/components/productivity/dashboard-productivity-chart.tsx](../frontend/web/features/dashboard/components/productivity/dashboard-productivity-chart.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/dashboard/components/productivity/dashboard-productivity.tsx](../frontend/web/features/dashboard/components/productivity/dashboard-productivity.tsx) | composed | Composes a shared-UI consumer |
| [features/dashboard/components/productivity/dashboard-project-activity.tsx](../frontend/web/features/dashboard/components/productivity/dashboard-project-activity.tsx) | composed | Composes a shared-UI consumer |
| [features/dashboard/components/overview/dashboard-quick-actions.tsx](../frontend/web/features/dashboard/components/overview/dashboard-quick-actions.tsx) | direct | Imports shared UI |
| [features/dashboard/components/weather/dashboard-sun.tsx](../frontend/web/features/dashboard/components/weather/dashboard-sun.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/dashboard/components/tasks/dashboard-tasks.tsx](../frontend/web/features/dashboard/components/tasks/dashboard-tasks.tsx) | direct | Imports shared UI |
| [features/dashboard/components/dashboard-view.tsx](../frontend/web/features/dashboard/components/dashboard-view.tsx) | direct | Imports shared UI |
| [features/documents/components/common/document-icon.tsx](../frontend/web/features/documents/components/common/document-icon.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/documents/components/common/folder-picker-modal.tsx](../frontend/web/features/documents/components/common/folder-picker-modal.tsx) | direct | Imports shared UI |
| [features/documents/components/common/quota-widget.tsx](../frontend/web/features/documents/components/common/quota-widget.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/documents/components/common/shimmer-loader.tsx](../frontend/web/features/documents/components/common/shimmer-loader.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/documents/components/common/upload-progress.tsx](../frontend/web/features/documents/components/common/upload-progress.tsx) | direct | Imports shared UI |
| [features/documents/components/document-explorer.tsx](../frontend/web/features/documents/components/document-explorer.tsx) | composed | Composes a shared-UI consumer |
| [features/documents/components/documents-view.tsx](../frontend/web/features/documents/components/documents-view.tsx) | composed | Composes a shared-UI consumer |
| [features/documents/components/download/download-queue-provider.tsx](../frontend/web/features/documents/components/download/download-queue-provider.tsx) | direct | Imports shared UI |
| [features/documents/components/explorer/breadcrumb-link.tsx](../frontend/web/features/documents/components/explorer/breadcrumb-link.tsx) | direct | Imports shared UI |
| [features/documents/components/explorer/details-panel.tsx](../frontend/web/features/documents/components/explorer/details-panel.tsx) | composed | Composes a shared-UI consumer |
| [features/documents/components/explorer/documents-sidebar-storage-panel.tsx](../frontend/web/features/documents/components/explorer/documents-sidebar-storage-panel.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/documents/components/explorer/documents-sidebar.tsx](../frontend/web/features/documents/components/explorer/documents-sidebar.tsx) | direct | Imports shared UI |
| [features/documents/components/explorer/explorer-breadcrumbs.tsx](../frontend/web/features/documents/components/explorer/explorer-breadcrumbs.tsx) | direct | Imports shared UI |
| [features/documents/components/explorer/explorer-toolbar.tsx](../frontend/web/features/documents/components/explorer/explorer-toolbar.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/documents/components/explorer/item-actions-menu.tsx](../frontend/web/features/documents/components/explorer/item-actions-menu.tsx) | direct | Imports shared UI |
| [features/documents/components/preview/file-preview-modal.tsx](../frontend/web/features/documents/components/preview/file-preview-modal.tsx) | direct | Imports shared UI |
| [features/documents/components/preview/preview-content.tsx](../frontend/web/features/documents/components/preview/preview-content.tsx) | direct | Imports shared UI |
| [features/documents/components/sharing/share-form.tsx](../frontend/web/features/documents/components/sharing/share-form.tsx) | direct | Imports shared UI |
| [features/documents/components/sharing/share-link.tsx](../frontend/web/features/documents/components/sharing/share-link.tsx) | direct | Imports shared UI |
| [features/documents/components/sharing/share-list.tsx](../frontend/web/features/documents/components/sharing/share-list.tsx) | direct | Imports shared UI |
| [features/documents/components/sharing/share-modal.tsx](../frontend/web/features/documents/components/sharing/share-modal.tsx) | direct | Imports shared UI |
| [features/documents/components/sharing/share-suggestions-dropdown.tsx](../frontend/web/features/documents/components/sharing/share-suggestions-dropdown.tsx) | direct | Imports shared UI |
| [features/documents/components/sharing/share-to-chat-modal.tsx](../frontend/web/features/documents/components/sharing/share-to-chat-modal.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-card.tsx](../frontend/web/features/documents/components/ui/documents-card.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/documents/components/ui/documents-confirm-dialog.tsx](../frontend/web/features/documents/components/ui/documents-confirm-dialog.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-empty-state.tsx](../frontend/web/features/documents/components/ui/documents-empty-state.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/documents/components/ui/documents-form-controls.tsx](../frontend/web/features/documents/components/ui/documents-form-controls.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-icon-button.tsx](../frontend/web/features/documents/components/ui/documents-icon-button.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-input-modal.tsx](../frontend/web/features/documents/components/ui/documents-input-modal.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-loading-state.tsx](../frontend/web/features/documents/components/ui/documents-loading-state.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-pagination.tsx](../frontend/web/features/documents/components/ui/documents-pagination.tsx) | direct | Imports shared UI |
| [features/documents/components/ui/documents-status-badge.tsx](../frontend/web/features/documents/components/ui/documents-status-badge.tsx) | direct | Imports shared UI |
| [features/documents/components/versions/version-history-table.tsx](../frontend/web/features/documents/components/versions/version-history-table.tsx) | direct | Imports shared UI |
| [features/documents/components/versions/version-management-modal.tsx](../frontend/web/features/documents/components/versions/version-management-modal.tsx) | direct | Imports shared UI |
| [features/documents/components/versions/version-uploader.tsx](../frontend/web/features/documents/components/versions/version-uploader.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls; Hidden native file picker |
| [features/documents/components/views/grid-view-card.tsx](../frontend/web/features/documents/components/views/grid-view-card.tsx) | composed | Composes a shared-UI consumer |
| [features/documents/components/views/grid-view.tsx](../frontend/web/features/documents/components/views/grid-view.tsx) | composed | Composes a shared-UI consumer |
| [features/documents/components/views/list-view-row.tsx](../frontend/web/features/documents/components/views/list-view-row.tsx) | direct | Imports shared UI |
| [features/documents/components/views/list-view.tsx](../frontend/web/features/documents/components/views/list-view.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/avatar-fallback.tsx](../frontend/web/features/meeting/components/common/avatar-fallback.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-action-tile.tsx](../frontend/web/features/meeting/components/common/meeting-action-tile.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-alert-dialog.tsx](../frontend/web/features/meeting/components/common/meeting-alert-dialog.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-auto-admit-toggle.tsx](../frontend/web/features/meeting/components/common/meeting-auto-admit-toggle.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/common/meeting-device-select.tsx](../frontend/web/features/meeting/components/common/meeting-device-select.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/common/meeting-hero.tsx](../frontend/web/features/meeting/components/common/meeting-hero.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-icon-dropdown.tsx](../frontend/web/features/meeting/components/common/meeting-icon-dropdown.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-join-link-modal.tsx](../frontend/web/features/meeting/components/common/meeting-join-link-modal.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-pagination.tsx](../frontend/web/features/meeting/components/common/meeting-pagination.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-participant-chat-toggle.tsx](../frontend/web/features/meeting/components/common/meeting-participant-chat-toggle.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/common/meeting-participant-list-item.tsx](../frontend/web/features/meeting/components/common/meeting-participant-list-item.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/common/meeting-room-control-button.tsx](../frontend/web/features/meeting/components/common/meeting-room-control-button.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-screen-share-toggle.tsx](../frontend/web/features/meeting/components/common/meeting-screen-share-toggle.tsx) | direct | Imports shared UI |
| [features/meeting/components/common/meeting-status-tag.tsx](../frontend/web/features/meeting/components/common/meeting-status-tag.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/history/meeting-history-avatar-stack.tsx](../frontend/web/features/meeting/components/history/meeting-history-avatar-stack.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/history/meeting-history-card.tsx](../frontend/web/features/meeting/components/history/meeting-history-card.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/history/meeting-history-list-row.tsx](../frontend/web/features/meeting/components/history/meeting-history-list-row.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/history/meeting-join-token-copy-button.tsx](../frontend/web/features/meeting/components/history/meeting-join-token-copy-button.tsx) | direct | Imports shared UI |
| [features/meeting/components/history/meeting-previous-view.tsx](../frontend/web/features/meeting/components/history/meeting-previous-view.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/meeting-layout.tsx](../frontend/web/features/meeting/components/meeting-layout.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/meeting-sidebar-stats-panel.tsx](../frontend/web/features/meeting/components/meeting-sidebar-stats-panel.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/meeting-sidebar.tsx](../frontend/web/features/meeting/components/meeting-sidebar.tsx) | direct | Imports shared UI |
| [features/meeting/components/recordings/meeting-recording-player.tsx](../frontend/web/features/meeting/components/recordings/meeting-recording-player.tsx) | direct | Imports shared UI |
| [features/meeting/components/recordings/meeting-recording-share-dialog.tsx](../frontend/web/features/meeting/components/recordings/meeting-recording-share-dialog.tsx) | direct | Imports shared UI |
| [features/meeting/components/recordings/meeting-recordings-view.tsx](../frontend/web/features/meeting/components/recordings/meeting-recordings-view.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-access-denied.tsx](../frontend/web/features/meeting/components/room/meeting-access-denied.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-fullscreen-overlay.tsx](../frontend/web/features/meeting/components/room/meeting-fullscreen-overlay.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-participant-tile.tsx](../frontend/web/features/meeting/components/room/meeting-participant-tile.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-password-gate.tsx](../frontend/web/features/meeting/components/room/meeting-password-gate.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-prejoin.tsx](../frontend/web/features/meeting/components/room/meeting-prejoin.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-recording-banner.tsx](../frontend/web/features/meeting/components/room/meeting-recording-banner.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/room/meeting-recording-controls.tsx](../frontend/web/features/meeting/components/room/meeting-recording-controls.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-room-audio-renderer.tsx](../frontend/web/features/meeting/components/room/meeting-room-audio-renderer.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/room/meeting-room-content.tsx](../frontend/web/features/meeting/components/room/meeting-room-content.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-room-footer.tsx](../frontend/web/features/meeting/components/room/meeting-room-footer.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-room-reaction-overlay.tsx](../frontend/web/features/meeting/components/room/meeting-room-reaction-overlay.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/room/meeting-room-reaction-picker.tsx](../frontend/web/features/meeting/components/room/meeting-room-reaction-picker.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-room-shell.tsx](../frontend/web/features/meeting/components/room/meeting-room-shell.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-room-stage.tsx](../frontend/web/features/meeting/components/room/meeting-room-stage.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-room-state.tsx](../frontend/web/features/meeting/components/room/meeting-room-state.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/meeting-waiting-approval.tsx](../frontend/web/features/meeting/components/room/meeting-waiting-approval.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/meeting-waiting-host.tsx](../frontend/web/features/meeting/components/room/meeting-waiting-host.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/message/meeting-message-attachments.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-attachments.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/message/meeting-message-editing-banner.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-editing-banner.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/message/meeting-message-input.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-input.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/meeting/components/room/message/meeting-message-item.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-item.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/message/meeting-message-list.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-list.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/message/meeting-message-options-menu.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-options-menu.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/message/meeting-message-reactions.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-reactions.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/message/meeting-message-read-receipts.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-read-receipts.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/message/meeting-message-time-divider.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-time-divider.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/room/side-panel/meeting-chat-notification-toggle-button.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-chat-notification-toggle-button.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/side-panel/meeting-participants-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-participants-panel.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/side-panel/meeting-room-chat-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-chat-panel.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/side-panel/meeting-room-desktop-side-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-desktop-side-panel.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/side-panel/meeting-room-mobile-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-mobile-panel.tsx) | direct | Imports shared UI |
| [features/meeting/components/room/side-panel/meeting-room-panel-content.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-panel-content.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/side-panel/meeting-room-settings-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-settings-panel.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/room/side-panel/meeting-room-share-link.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-share-link.tsx) | direct | Imports shared UI |
| [features/meeting/components/schedule/schedule-meeting-modal.tsx](../frontend/web/features/meeting/components/schedule/schedule-meeting-modal.tsx) | direct | Imports shared UI |
| [features/meeting/components/schedule/upcoming-meeting-card.tsx](../frontend/web/features/meeting/components/schedule/upcoming-meeting-card.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/schedule/upcoming-meetings-view.tsx](../frontend/web/features/meeting/components/schedule/upcoming-meetings-view.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/ui/meeting-card.tsx](../frontend/web/features/meeting/components/ui/meeting-card.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/ui/meeting-empty-state.tsx](../frontend/web/features/meeting/components/ui/meeting-empty-state.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/ui/meeting-field.tsx](../frontend/web/features/meeting/components/ui/meeting-field.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/meeting/components/ui/meeting-form-controls.tsx](../frontend/web/features/meeting/components/ui/meeting-form-controls.tsx) | direct | Imports shared UI |
| [features/meeting/components/ui/meeting-icon-button.tsx](../frontend/web/features/meeting/components/ui/meeting-icon-button.tsx) | composed | Composes a shared-UI consumer |
| [features/meeting/components/ui/meeting-loading-state.tsx](../frontend/web/features/meeting/components/ui/meeting-loading-state.tsx) | direct | Imports shared UI |
| [features/meeting/components/ui/meeting-status-badge.tsx](../frontend/web/features/meeting/components/ui/meeting-status-badge.tsx) | direct | Imports shared UI |
| [features/meeting/components/ui/meeting-toggle.tsx](../frontend/web/features/meeting/components/ui/meeting-toggle.tsx) | direct | Imports shared UI |
| [features/notification/components/chat-message-alert-manager.tsx](../frontend/web/features/notification/components/chat-message-alert-manager.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/notification/components/notification-category-icon.tsx](../frontend/web/features/notification/components/notification-category-icon.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/notification/components/notification-detail-modal.tsx](../frontend/web/features/notification/components/notification-detail-modal.tsx) | direct | Imports shared UI |
| [features/notification/components/notification-item.tsx](../frontend/web/features/notification/components/notification-item.tsx) | direct | Imports shared UI |
| [features/notification/components/notification-list.tsx](../frontend/web/features/notification/components/notification-list.tsx) | direct | Imports shared UI |
| [features/notification/components/notification-managers.tsx](../frontend/web/features/notification/components/notification-managers.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/notification/components/push-subscription-manager.tsx](../frontend/web/features/notification/components/push-subscription-manager.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/notification/components/renderers/calendar-reminder-renderer.tsx](../frontend/web/features/notification/components/renderers/calendar-reminder-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/renderers/default-renderer.tsx](../frontend/web/features/notification/components/renderers/default-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/renderers/invitation-accepted-renderer.tsx](../frontend/web/features/notification/components/renderers/invitation-accepted-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/renderers/invitation-declined-renderer.tsx](../frontend/web/features/notification/components/renderers/invitation-declined-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/renderers/invitation-renderer.tsx](../frontend/web/features/notification/components/renderers/invitation-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/renderers/meeting-invitation-renderer.tsx](../frontend/web/features/notification/components/renderers/meeting-invitation-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/renderers/project-invitation-renderer.tsx](../frontend/web/features/notification/components/renderers/project-invitation-renderer.tsx) | direct | Imports shared UI |
| [features/notification/components/service-worker-navigation-listener.tsx](../frontend/web/features/notification/components/service-worker-navigation-listener.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/notification/components/space-notification-alert-manager.tsx](../frontend/web/features/notification/components/space-notification-alert-manager.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/pomodoro/components/pomodoro-active-task.tsx](../frontend/web/features/pomodoro/components/pomodoro-active-task.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-ambient-player.tsx](../frontend/web/features/pomodoro/components/pomodoro-ambient-player.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-audio-icon.tsx](../frontend/web/features/pomodoro/components/pomodoro-audio-icon.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/pomodoro/components/pomodoro-audio-track-list.tsx](../frontend/web/features/pomodoro/components/pomodoro-audio-track-list.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-calendar-task-form.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-form.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-calendar-task-list.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-list.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-calendar-task-panel.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-panel.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-config-provider.tsx](../frontend/web/features/pomodoro/components/pomodoro-config-provider.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/pomodoro/components/pomodoro-controls.tsx](../frontend/web/features/pomodoro/components/pomodoro-controls.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-daily-stats.tsx](../frontend/web/features/pomodoro/components/pomodoro-daily-stats.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-focus-dialog.tsx](../frontend/web/features/pomodoro/components/pomodoro-focus-dialog.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-focus-switch-confirmation.tsx](../frontend/web/features/pomodoro/components/pomodoro-focus-switch-confirmation.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-mini-timer.tsx](../frontend/web/features/pomodoro/components/pomodoro-mini-timer.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-project-task-panel.tsx](../frontend/web/features/pomodoro/components/pomodoro-project-task-panel.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-report.tsx](../frontend/web/features/pomodoro/components/pomodoro-report.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-session-history-item.tsx](../frontend/web/features/pomodoro/components/pomodoro-session-history-item.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-session-history.tsx](../frontend/web/features/pomodoro/components/pomodoro-session-history.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-session-provider.tsx](../frontend/web/features/pomodoro/components/pomodoro-session-provider.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-settings-form.tsx](../frontend/web/features/pomodoro/components/pomodoro-settings-form.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-stats-card.tsx](../frontend/web/features/pomodoro/components/pomodoro-stats-card.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-task-actions.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-actions.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-task-editor.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-editor.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-task-filters.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-filters.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-task-picker.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-picker.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-timer-display.tsx](../frontend/web/features/pomodoro/components/pomodoro-timer-display.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/pomodoro-view.tsx](../frontend/web/features/pomodoro/components/pomodoro-view.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/task-focus-button.tsx](../frontend/web/features/pomodoro/components/task-focus-button.tsx) | direct | Imports shared UI |
| [features/pomodoro/components/task-focus-history.tsx](../frontend/web/features/pomodoro/components/task-focus-history.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/create-project-dialog.tsx](../frontend/web/features/project/components/dialogs/create-project-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/invite-member-dialog.tsx](../frontend/web/features/project/components/dialogs/invite-member-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/member-permissions-dialog.tsx](../frontend/web/features/project/components/dialogs/member-permissions-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/project-settings-dialog.tsx](../frontend/web/features/project/components/dialogs/project-settings-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/select-task-channel-dialog.tsx](../frontend/web/features/project/components/dialogs/select-task-channel-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/task-chat-dialog.tsx](../frontend/web/features/project/components/dialogs/task-chat-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/dialogs/task-form-dialog.tsx](../frontend/web/features/project/components/dialogs/task-form-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/forms/project-label-manager.tsx](../frontend/web/features/project/components/forms/project-label-manager.tsx) | direct | Imports shared UI |
| [features/project/components/forms/task-date-range-fields.tsx](../frontend/web/features/project/components/forms/task-date-range-fields.tsx) | direct | Imports shared UI |
| [features/project/components/forms/task-details-fields.tsx](../frontend/web/features/project/components/forms/task-details-fields.tsx) | composed | Composes a shared-UI consumer |
| [features/project/components/layout/project-detail-content.tsx](../frontend/web/features/project/components/layout/project-detail-content.tsx) | composed | Composes a shared-UI consumer |
| [features/project/components/layout/project-detail-fallback.tsx](../frontend/web/features/project/components/layout/project-detail-fallback.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/project/components/layout/project-detail-sidebar.tsx](../frontend/web/features/project/components/layout/project-detail-sidebar.tsx) | direct | Imports shared UI |
| [features/project/components/layout/project-detail-toolbar.tsx](../frontend/web/features/project/components/layout/project-detail-toolbar.tsx) | direct | Imports shared UI |
| [features/project/components/list/project-task-row.tsx](../frontend/web/features/project/components/list/project-task-row.tsx) | direct | Imports shared UI |
| [features/project/components/list/task-inline-creator.tsx](../frontend/web/features/project/components/list/task-inline-creator.tsx) | direct | Imports shared UI |
| [features/project/components/members/pending-invitations-list.tsx](../frontend/web/features/project/components/members/pending-invitations-list.tsx) | direct | Imports shared UI |
| [features/project/components/members/project-members-panel.tsx](../frontend/web/features/project/components/members/project-members-panel.tsx) | direct | Imports shared UI |
| [features/project/components/project-realtime-manager.tsx](../frontend/web/features/project/components/project-realtime-manager.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/project/components/summary/member-workload-list.tsx](../frontend/web/features/project/components/summary/member-workload-list.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/project/components/summary/priority-distribution-bar.tsx](../frontend/web/features/project/components/summary/priority-distribution-bar.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/project/components/summary/project-metric-card.tsx](../frontend/web/features/project/components/summary/project-metric-card.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/project/components/summary/project-summary-panel.tsx](../frontend/web/features/project/components/summary/project-summary-panel.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/project/components/task-detail/task-activity-panel.tsx](../frontend/web/features/project/components/task-detail/task-activity-panel.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-checklist-section.tsx](../frontend/web/features/project/components/task-detail/task-checklist-section.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-comments-section.tsx](../frontend/web/features/project/components/task-detail/task-comments-section.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-dependencies-section.tsx](../frontend/web/features/project/components/task-detail/task-dependencies-section.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-detail-drawer.tsx](../frontend/web/features/project/components/task-detail/task-detail-drawer.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-documents-section.tsx](../frontend/web/features/project/components/task-detail/task-documents-section.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/project/components/task-detail/task-labels-picker.tsx](../frontend/web/features/project/components/task-detail/task-labels-picker.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-properties-panel.tsx](../frontend/web/features/project/components/task-detail/task-properties-panel.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-status-picker.tsx](../frontend/web/features/project/components/task-detail/task-status-picker.tsx) | direct | Imports shared UI |
| [features/project/components/task-detail/task-subtasks-section.tsx](../frontend/web/features/project/components/task-detail/task-subtasks-section.tsx) | direct | Imports shared UI |
| [features/project/components/ui/avatar-stack.tsx](../frontend/web/features/project/components/ui/avatar-stack.tsx) | direct | Imports shared UI |
| [features/project/components/ui/project-confirm-dialog.tsx](../frontend/web/features/project/components/ui/project-confirm-dialog.tsx) | direct | Imports shared UI |
| [features/project/components/ui/project-form-controls.tsx](../frontend/web/features/project/components/ui/project-form-controls.tsx) | direct | Imports shared UI |
| [features/project/components/ui/project-preview-card.tsx](../frontend/web/features/project/components/ui/project-preview-card.tsx) | content | Semantic content/layout or specialized rendering; no raw base controls |
| [features/project/components/ui/status-badge.tsx](../frontend/web/features/project/components/ui/status-badge.tsx) | direct | Imports shared UI |
| [features/project/components/ui/task-card.tsx](../frontend/web/features/project/components/ui/task-card.tsx) | direct | Imports shared UI |
| [features/project/components/ui/task-chat-button.tsx](../frontend/web/features/project/components/ui/task-chat-button.tsx) | direct | Imports shared UI |
| [features/project/components/ui/task-label-badges.tsx](../frontend/web/features/project/components/ui/task-label-badges.tsx) | direct | Imports shared UI |
| [features/project/components/ui/task-quick-filters.tsx](../frontend/web/features/project/components/ui/task-quick-filters.tsx) | composed | Composes a shared-UI consumer |
| [features/project/components/views/board-view.tsx](../frontend/web/features/project/components/views/board-view.tsx) | direct | Imports shared UI |
| [features/project/components/views/calendar-view.tsx](../frontend/web/features/project/components/views/calendar-view.tsx) | direct | Imports shared UI |
| [features/project/components/views/gantt-view.tsx](../frontend/web/features/project/components/views/gantt-view.tsx) | direct | Imports shared UI |
| [features/project/components/views/list-view.tsx](../frontend/web/features/project/components/views/list-view.tsx) | composed | Composes a shared-UI consumer |
| [features/project/components/views/project-documents-view.tsx](../frontend/web/features/project/components/views/project-documents-view.tsx) | composed | Composes a shared-UI consumer |
| [features/project/components/views/project-members-view.tsx](../frontend/web/features/project/components/views/project-members-view.tsx) | direct | Imports shared UI |
| [features/project/components/views/summary-view.tsx](../frontend/web/features/project/components/views/summary-view.tsx) | composed | Composes a shared-UI consumer |
| [features/project/screens/project-detail-screen.tsx](../frontend/web/features/project/screens/project-detail-screen.tsx) | composed | Composes a shared-UI consumer |
| [features/project/screens/project-invitations-screen.tsx](../frontend/web/features/project/screens/project-invitations-screen.tsx) | direct | Imports shared UI |
| [features/user-setting/components/account-theme-sync.tsx](../frontend/web/features/user-setting/components/account-theme-sync.tsx) | content | Provider/composition or types; no standalone base UI |
| [features/user-setting/components/password-input.tsx](../frontend/web/features/user-setting/components/password-input.tsx) | direct | Imports shared UI |
| [features/user-setting/components/password-tab.tsx](../frontend/web/features/user-setting/components/password-tab.tsx) | direct | Imports shared UI |
| [features/user-setting/components/pomodoro-tab.tsx](../frontend/web/features/user-setting/components/pomodoro-tab.tsx) | direct | Imports shared UI |
| [features/user-setting/components/profile-tab.tsx](../frontend/web/features/user-setting/components/profile-tab.tsx) | direct | Imports shared UI; Hidden native file picker |
| [features/user-setting/components/revoke-session-modal.tsx](../frontend/web/features/user-setting/components/revoke-session-modal.tsx) | direct | Imports shared UI |
| [features/user-setting/components/sessions-tab.tsx](../frontend/web/features/user-setting/components/sessions-tab.tsx) | direct | Imports shared UI |
| [features/user-setting/components/settings-tab.tsx](../frontend/web/features/user-setting/components/settings-tab.tsx) | direct | Imports shared UI |
| [features/user-setting/components/ui/setting-form-controls.tsx](../frontend/web/features/user-setting/components/ui/setting-form-controls.tsx) | direct | Imports shared UI |
| [features/user-setting/components/user-settings-modal.tsx](../frontend/web/features/user-setting/components/user-settings-modal.tsx) | direct | Imports shared UI |

<!-- shared-base-ui:end -->

## Dashboard polish and resilience - 2026-10-18

- Reviewed all 12 Dashboard components and their existing hooks, source-specific links, shared modal controls, and theme roles. Scope is limited to Dashboard; no API, permissions, stored colors, global theme, or other-page layout changes.
- Addressed the five issues from critique `2026-10-18T04-23-09Z__s-dashboard-components-dashboard-view-tsx-409c2db7.md`: selected task filters use the readable link token; task lists reveal six more rows at a time with per-filter limits and a collapse action; summary values distinguish loading from unavailable data and link to the matching retry panel; task activity has keyboard/touch-accessible Daily totals; long notification titles/messages scroll while close/details controls stay outside the message scroll area.
- Active-filter indicator contrast is 11.15:1 Light and 8.62:1 Dark against the card surface. Chart labels use 12px, and the dynamic chart placeholder reserves the chart's actual height. Panels use the existing radius token and neutral secondary emphasis.
- Clarified task ordering, panel link accessible names, the project empty state, and live meeting status. Notification read-state failures provide a Retry toast using the existing React Query/Redux synchronization. Interactive links, buttons, filters, and disclosure controls have pointer cursors, inherited from the shared Button where applicable.
- Verification: ESLint passed for the nine changed Dashboard TSX files; TypeScript passed once with noEmit and incremental disabled; the focused detector returned no findings. No test files, packages, servers, or cache setup were added.
- Browser inventory again returned no apps/browsers. Source checks and contrast calculations do not replace visual, keyboard, touch, or live API verification; desktop/mobile, zoom, and light/dark rendering remain unverified in a connected browser.

## Neutral Modern theme - 2026-10-18

This replaces the earlier palette-preserving contrast follow-up. The user approved white/gray Light and charcoal Dark surfaces, navy actions, and muted red/green/amber information states. Logo/auth branding, stored custom colors, content, geometry, workflows, permissions, and saved-theme behavior remain intact.

- Latest user steering: light primary #22396F, dark primary #0D1C42. Deep navy actions use a quiet inset outline in Dark; links, progress, and chart marks retain a separate readable blue-gray. Neutral surfaces and semantic status colors are unchanged.
- Runtime roles: neutral page/sidebar/card/hover layers; separate solid status fills, white on-fill foregrounds, status-content text/icons, soft backgrounds, and restrained outline mixes. Links have a separate role from filled primary actions.
- Instant meeting/creating icons use neutral secondary tiles. Mic/Camera off stays soft red on hover; actual Leave/delete actions remain solid red. Navigation, Settings tabs, recurrence choices, and ordinary badges use soft selection/status backgrounds.
- Review spans all 415 TSX files and 2 CSS files from the existing inventory, plus presentation constants/styles in TS helpers. Shared primitives, all feature modules, public/auth/shared-document routes, third-party notifications/calendar/emoji styling, charts, status dots, and media controls follow the new roles. Existing navy/ice brand primitives are intentional logo/auth exceptions.
- No global SVG recoloring, stored-color migration, API/permission changes, layout edits, new dependencies, test suites, temporary files, or cache setup.
- Final contrast checks: 233 passed, covering semantic roles, 71 custom/sample colors, control edges, chart marks, and media. Minimum checked text 4.70:1; minimum checked control/icon 3.11:1. A source scan across 673 TS/TSX/CSS files found no failing explicit literal foreground/background pairs after correcting Gantt neutral labels. These are computed token/source checks, not full rendered-state certification.
- Supplied examples: neutral Instant meeting icon 10.10:1 Light / 8.10:1 Dark; Mic off 5.75:1 Light / 6.57:1 Dark. White primary-button labels: 11.15:1 Light navy / 16.64:1 Dark navy.
- TypeScript passed once with noEmit and incremental disabled. Final ESLint covered 278 changed TS/TSX files: 0 new diagnostics versus HEAD; 162 existing errors and 67 existing warnings remain. In-memory CSS compilation generated all 37 checked theme utilities, including deep navy action outlines.
- The Impeccable detector reported only the unchanged semantic blockquote border in message-formatter.tsx, retained under the existing content-formatting exception. No additional test suites or artifacts were created. Older verification sections below are historical.
- Visual verification is unavailable: the computer-use inventory returned no connected apps/browsers. The two supplied meeting examples and desktop/mobile theme rendering remain visually unverified in this session.

## Contrast follow-up (historical) - 2026-10-18

This pass preserves the existing navy/ice palette, stored user colors, layouts, and workflows. It fixes foreground/background pairings rather than replacing the theme. The historical verification below belongs to the earlier simplification; it is not browser evidence for this follow-up.

### Source coverage

The current inventory is **415 TSX components/routes and 2 CSS files**, within **673 TS/TSX/CSS sources** across app, shared components, and features. All current TSX paths are already listed in the detailed inventory below. The additional stylesheet is [responsive-dialog.module.css](../frontend/web/components/ui/responsive-dialog.module.css); its geometry-only rules retain inherited theme colors.

Source scans covered color utility classes, parent/child color inheritance, conditional variants, inline fills, SVG attributes, opacity, and color configuration. Flagged cases were reviewed in their surrounding components. This is source coverage, not a claim that every rendered state was exercised in a browser.

| Area | TSX/CSS files | Contrast disposition |
| --- | ---: | --- |
| App routes/styles | 28 | Preserve public/auth brand panels and readable text pairs; outline custom project progress without changing its saved fill. |
| Shared UI | 33 | Give outline buttons an explicit foreground; remove faded select chevrons; outline slider tracks. Retain readable button, input, checkbox, switch, badge, menu, tooltip, dialog, and tab variants. |
| Dashboard | 12 | Outline nonzero heatmap cells and custom-color progress. Keep chart axes, series, tooltips, panels, feedback, and navigation pairs. |
| Projects | 51 | Fix custom-fill checkmarks, selected color outlines, and avatar status pairs. Retain task cards, board/backlog/calendar/Gantt, members, documents embedding, drawers, and dialogs. |
| Calendar | 35 | Choose checkmark foregrounds from the actual fill; use visible checkbox borders and readable icons on custom tints. Keep completed/declined events readable without fading their text. Review calendar grids, mini-calendar, drawers, popovers, and modals. |
| Pomodoro | 28 | Remove faded duration captions and put project icons on their saved fill with a readable foreground. Keep timer, tasks, history, audio, statistics, mini-timer, and settings pairs. |
| Messages | 90 | Fix Threads icon, placeholders, unchecked toggle, file-type icon pairs, video play buttons, and lightbox controls. Keep bubbles, formatted content, reactions, threads, side panels, menus, and dialogs. |
| Meetings | 71 | Fix room/creating icons, read receipts, admission actions, room pagination, nested participant/toggle surfaces, form surfaces, video play controls, and participant media controls. Review prejoin, gates, room panels, recordings, settings, and dialogs. |
| Documents | 39 | Put download status/text on a normal card surface; distinguish progress from its track. Keep video preview canvas dark; retain explorer, grid/list, details, sharing, upload, and dialog pairs. |
| Notifications | 16 | Pair category icons with their status foreground; keep custom-tint invitation icons readable. Review invitations, reminders, detail modal, and list states. |
| Settings | 10 | Retain readable profile, password, preferences, session, form-control, and settings-modal pairs. Theme persistence and Save Settings behavior are unchanged. |
| Authentication | 4 | Retain readable foregrounds on light/dark forms and invariant navy branding. |

The unavailable AI/Tasks routes remain composition/placeholder surfaces covered by the app review. Default, hover, selected, focus, pending, empty, error, and disabled styling was traced where declared; conditional branches and third-party generated DOM remain subject to the browser limitation below.

### Applied contrast rules and verification

- Filled primary/status surfaces use their matching foreground; soft surfaces use readable semantic text. Custom hex fills keep their stored value and reuse readableTextOnColor for labels/checkmarks. Do not apply a global SVG recoloring rule.
- Invariant media controls use opaque media-surface/media-foreground pairs. The new media-destructive token is the existing dark destructive hue (#FFB4BC), used for muted microphone indicators over dark video labels in both themes. Media menu content retains normal card colors and focus indicators.
- **129 focused contrast checks passed**, including semantic fills, secondary text, status soft surfaces, input/focus boundaries, dark media overlays, and **55 custom/sample colors**. Minimum checked text contrast: **4.70:1**; minimum checked control/icon contrast: **3.19:1**. These calculations cover the named pairs, not every computed browser pixel.
- Instant meeting icon: **1.74 ? 9.47:1 in Light**, **1.00 ? 16.44:1 in Dark**.
- TypeScript: passed once with noEmit and incremental disabled. ESLint: 47 changed TS/TSX files, **0 new diagnostics** versus HEAD; **25 pre-existing errors and 22 pre-existing warnings** remain. No tests, dependencies, temporary files, or cache setup were added.
- In-memory Tailwind CSS compilation: passed for the new media tokens, inset outlines, custom-fill marker, and scoped media-trigger focus rule.
- Impeccable detector: one finding in the unchanged message formatter's semantic blockquote border; retain the existing documented content-formatting exception.
- **Browser spot-checks were unavailable:** the computer-use inventory returned no connected apps/browsers. Desktop/mobile rendering, theme switching, and third-party popup states were not visually exercised in this follow-up.
- Decorative separators, skeletons, and inactive calendar/heatmap space retain subtle contrast. Disabled controls and transient drag previews remain visually subdued. Uploaded images, document pages, avatars, videos, and user-authored rich content are not recolored.

## Applied rules

- Page titles 22px/600, sections 18px/600, body 14px, metadata 12px, and compact task/chat content 13px. Public/auth display headings, timer numerals, and content formatting retain appropriate scales.
- Controls 8px, panels 14px, dialogs 16px. Pills remain for badges, avatars, and segmented controls; dense calendar event geometry remains functional.
- Opaque semantic surfaces; borders on persistent panels; shared elevation on floating menus/dialogs. Remove decorative glows, gradients, bounce, button lifting, and excessive emphasis.
- Preserve functional ring/progress feedback, user-selected colors, media, document/message formatting, and pending/error/disabled states. Reduced motion retains readable status text/icons.

## Interaction and feature changes

- Mobile calendar sidebar now sits above its dismissing backdrop and below dialogs; ordinary pointer activation is covered at 320, 390, 768, and 1440px in both themes.
- Project search/status/priority/assignee controls stack and wrap without overlapping; selections and reset remain intact. Long assignee labels are checked with 200% root text sizing at 320 and 768px.
- Shared dialogs use initial focus, Tab containment, scroll locking, Escape, nested-select handling, and focus restoration. Opener capture handles autofocus and keyed dialog remounts; Settings restores the persistent user-menu trigger.
- Meetings uses a compact date/time/upcoming header and one primary New meeting action. Pomodoro retains the timer ring, modes, task association, audio, and history with flatter statistics. Documents storage and empty states are restrained.
- Chat keeps unread counts, typing text, invitations, threads, and formatting without sidebar stripes or bouncing indicators. Settings/overlays use shared headings, corners, close controls, and semantic state colors.
- Home/auth was subsequently restored to its original presentation and labels at the user's request. AI remains explicitly unavailable; Tasks still directs visitors to working features. Visible Gantt terminology stays corrected.

## Verification

| Check | Result |
| --- | --- |
| TypeScript and production build | Passed; no source type errors. |
| Theme/color/dashboard tests (historical) | 21 passed before cleanup. Added theme/color tests were removed; the pre-existing dashboard suite remains. |
| UI regressions (historical) | 26 cases passed: calendar pointer activation, filter selection/reset/non-overlap, long labels/enlarged text, dialog trap/scroll/restore, nested select, and Settings opener restoration. The added browser suite was removed during cleanup. |
| Full frontend lint | Baseline 214 errors / 124 warnings; current 214 errors / 124 warnings; 0 introduced diagnostics. Existing lint cleanup is outside this change. |
| Route matrix | 17 routes × Light/Dark × desktop/mobile = 68 captures; no measured normal-text contrast failures or document overflow. |
| Interactive state checks | 62 settings/project/chat/calendar/empty/error scenarios, 8 theme/emoji/SweetAlert/Sonner checks, 36 detailed control cases, and 28 held-response loading states. |
| Contrast | Existing token tests cover paired text/action/hover/selection/status colors; browser checks enforce 4.5:1 visible normal text and 3:1 sampled input/focus/control boundaries. |
| Detector | Post-migration scan and confirmation retain only the semantic message-blockquote warning; all 10 bounce advisories and both decorative navigation accents are removed. |

Routes checked: `/`, `/login`, `/register`, `/forgot-password`, `/dashboard`, `/projects`, `/projects/theme-project`, `/projects/invitations`, `/tasks`, `/calendar`, `/pomodoro`, `/chat`, `/documents`, `/documents/shared/theme-document`, `/meetings`, `/meetings/theme-room`, and `/ai`.

Browser checks use local API fixtures. They exercise saved/failed settings saves, reload, logout, account changes, views, dialogs/drawers, overlays, empty/error/loading/disabled/pending states. They do not establish live backend, connected LiveKit, real uploads, or every permission/content combination. Per-file “feature-family” verification means representative routed coverage, not a claim that every component branch was rendered.

The external Google sign-in image is blocked by the offline browser fixtures; this is a fixture limitation. The original home copy was restored with the requested presentation; this does not change the implemented capabilities described in PRODUCT.md.

## Home/auth restoration

The user subsequently requested the original UI, logic, and layout for `/`, `/login`, `/register`, and `/forgot-password`. Restore the pre-simplification, palette-migrated source for these pages and their auth forms. Preserve the current root providers, theme palette, workspace simplification, mobile fixes, and shared dialog behavior. Auth field surface overrides are local; the shared field keeps its simplified default for workspace consumers.

The verification table above records the original simplification run. Restoration verification passed: production build and standalone TypeScript; 16 route/theme/viewport captures plus 12 auth validation/reset-state captures; four complete registration/password-reset workflow scenarios using mocked API responses. Password visibility, mismatch/error feedback, navigation, restored 18px auth field corners, text contrast, and page overflow were checked. Scoped lint retains four pre-existing errors and introduces no diagnostics.

## Intentional exceptions

- Restored home/auth decoration, display type, controls, motion, and copy follow the user's explicit preference and are excluded from future workspace-style normalization.

- `features/chat/utils/message-formatter.tsx:441`: semantic `<blockquote>` retains its `border-l-4` and all content typography unchanged. It is not navigation decoration. No detector rule/file is globally suppressed.
- User-selected project/calendar/label fills, emoji identities/reactions, uploaded images, document previews, and media streams retain intrinsic appearance.
- Dark media overlays retain translucency/blur only where needed for content controls; persistent participant tiles no longer use custom shadows.
- Real elapsed-time rings, chart geometry, progress tracks, recording/playback information, and state indicators remain functional.

## Shared logic and cleanup

- `frontend/web/components/ui/use-modal-dialog.ts`: shared focus/scroll ownership. The previous calendar hook path remains a compatibility re-export.
- Added browser tests, fixtures, Playwright configuration/dependency, theme/color/preference tests, temporary audit/migration/restoration scripts, and generated browser reports were removed at the user's request. Pre-existing application, deployment, and test files are retained.
- `frontend/web/app/globals.css`: runtime semantic typography/radius, surface, elevation, motion, and theme tokens.
- `DESIGN.md`, `.impeccable/design.json`, and `docs/design-tokens.md`: final shared rules and representative examples.

## TSX coverage

| File | Disposition | Reason | Verification |
| --- | --- | --- | --- |
| [app/(auth)/forgot-password/page.tsx](../frontend/web/app/(auth)/forgot-password/page.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [app/(auth)/layout.tsx](../frontend/web/app/(auth)/layout.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [app/(auth)/login/page.tsx](../frontend/web/app/(auth)/login/page.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [app/(auth)/register/page.tsx](../frontend/web/app/(auth)/register/page.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [app/(public)/documents/shared/[id]/components/shared-denied.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-denied.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/documents/shared/[id]/components/shared-details.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-details.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/documents/shared/[id]/components/shared-folder-browser.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-folder-browser.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/documents/shared/[id]/components/shared-header.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-header.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/documents/shared/[id]/components/shared-preview.tsx](../frontend/web/app/(public)/documents/shared/[id]/components/shared-preview.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/documents/shared/[id]/page.tsx](../frontend/web/app/(public)/documents/shared/[id]/page.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/layout.tsx](../frontend/web/app/(public)/layout.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(public)/page.tsx](../frontend/web/app/(public)/page.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [app/(workspace)/ai/page.tsx](../frontend/web/app/(workspace)/ai/page.tsx) | change | Identify the standalone assistant as unavailable; provide a working return action. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/calendar/page.tsx](../frontend/web/app/(workspace)/calendar/page.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/chat/page.tsx](../frontend/web/app/(workspace)/chat/page.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/dashboard/page.tsx](../frontend/web/app/(workspace)/dashboard/page.tsx) | keep | Route/composition wrapper delegates presentation to reviewed feature components; retain its existing API. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/documents/page.tsx](../frontend/web/app/(workspace)/documents/page.tsx) | keep | Route/composition wrapper delegates presentation to reviewed feature components; retain its existing API. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/layout.tsx](../frontend/web/app/(workspace)/layout.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/meetings/[joinToken]/page.tsx](../frontend/web/app/(workspace)/meetings/[joinToken]/page.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/meetings/page.tsx](../frontend/web/app/(workspace)/meetings/page.tsx) | keep | Route/composition wrapper delegates presentation to reviewed feature components; retain its existing API. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/pomodoro/page.tsx](../frontend/web/app/(workspace)/pomodoro/page.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/projects/[id]/page.tsx](../frontend/web/app/(workspace)/projects/[id]/page.tsx) | keep | Route/composition wrapper delegates presentation to reviewed feature components; retain its existing API. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/projects/invitations/page.tsx](../frontend/web/app/(workspace)/projects/invitations/page.tsx) | keep | Route/composition wrapper delegates presentation to reviewed feature components; retain its existing API. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/projects/layout.tsx](../frontend/web/app/(workspace)/projects/layout.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/projects/page.tsx](../frontend/web/app/(workspace)/projects/page.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [app/(workspace)/tasks/page.tsx](../frontend/web/app/(workspace)/tasks/page.tsx) | change | Direct visitors to implemented Projects, Calendar, and Dashboard workflows. | Source review; feature-family route/state checks (not every branch). |
| [app/layout.tsx](../frontend/web/app/layout.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [components/common/input-field.tsx](../frontend/web/components/common/input-field.tsx) | change | Shared simplified defaults and password-toggle labels retained; optional auth variant restores auth-specific field surfaces only. | Source review; feature-family route/state checks (not every branch). |
| [components/common/notification-dropdown.tsx](../frontend/web/components/common/notification-dropdown.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/common/otp-input.tsx](../frontend/web/components/common/otp-input.tsx) | functional/content exception | Auth-only OTP input restored to its original geometry; input/paste/keyboard behavior retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [components/common/theme-provider.tsx](../frontend/web/components/common/theme-provider.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; routed app composition exercised. |
| [components/common/user-profile-dropdown.tsx](../frontend/web/components/common/user-profile-dropdown.tsx) | change | Normalize menu styling and retain a persistent focus target when Settings replaces the menu. | Source review; feature-family route/state checks (not every branch). |
| [components/layout/workspace-header.tsx](../frontend/web/components/layout/workspace-header.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [components/layout/workspace-shell.tsx](../frontend/web/components/layout/workspace-shell.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/alert-dialog.tsx](../frontend/web/components/ui/alert-dialog.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/badge.tsx](../frontend/web/components/ui/badge.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/breadcrumb.tsx](../frontend/web/components/ui/breadcrumb.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/button.tsx](../frontend/web/components/ui/button.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/card.tsx](../frontend/web/components/ui/card.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/checkbox.tsx](../frontend/web/components/ui/checkbox.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/custom-badge.tsx](../frontend/web/components/ui/custom/custom-badge.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/custom-checkbox.tsx](../frontend/web/components/ui/custom/custom-checkbox.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/custom-date-range.tsx](../frontend/web/components/ui/custom/custom-date-range.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/custom-select.tsx](../frontend/web/components/ui/custom/custom-select.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/custom-tabs.tsx](../frontend/web/components/ui/custom/custom-tabs.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/custom-tag.tsx](../frontend/web/components/ui/custom/custom-tag.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/custom/simple-pagination.tsx](../frontend/web/components/ui/custom/simple-pagination.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/dialog.tsx](../frontend/web/components/ui/dialog.tsx) | change | Shared focus containment/restoration, accessible title, scroll locking, nested popup handling, and common dialog surface. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/input.tsx](../frontend/web/components/ui/input.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/popover.tsx](../frontend/web/components/ui/popover.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/select.tsx](../frontend/web/components/ui/select.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/separator.tsx](../frontend/web/components/ui/separator.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/skeleton.tsx](../frontend/web/components/ui/skeleton.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/slider.tsx](../frontend/web/components/ui/slider.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/switch.tsx](../frontend/web/components/ui/switch.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/table.tsx](../frontend/web/components/ui/table.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/tabs.tsx](../frontend/web/components/ui/tabs.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/textarea.tsx](../frontend/web/components/ui/textarea.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [components/ui/tooltip.tsx](../frontend/web/components/ui/tooltip.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/auth/components/forgot-password-form.tsx](../frontend/web/features/auth/components/forgot-password-form.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [features/auth/components/login-form.tsx](../frontend/web/features/auth/components/login-form.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [features/auth/components/register-form.tsx](../frontend/web/features/auth/components/register-form.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [features/auth/components/social-login-buttons.tsx](../frontend/web/features/auth/components/social-login-buttons.tsx) | functional/content exception | User-requested restoration of the original home/auth layout, typography, labels, controls, and interactions; semantic palette retained. | Restored source verified; focused auth/home browser checks recorded above. |
| [features/calendar/components/drawer/calendar-task-list.tsx](../frontend/web/features/calendar/components/drawer/calendar-task-list.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/drawer/calendar-tasks-drawer.tsx](../frontend/web/features/calendar/components/drawer/calendar-tasks-drawer.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/attachment-editor.tsx](../frontend/web/features/calendar/components/modal/attachment-editor.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-conference-card.tsx](../frontend/web/features/calendar/components/modal/calendar-conference-card.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-document-picker-dialog.tsx](../frontend/web/features/calendar/components/modal/calendar-document-picker-dialog.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-documents-section.tsx](../frontend/web/features/calendar/components/modal/calendar-documents-section.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-modal.tsx](../frontend/web/features/calendar/components/modal/calendar-modal.tsx) | change | use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-select.tsx](../frontend/web/features/calendar/components/modal/calendar-select.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-task-deadline-fields.tsx](../frontend/web/features/calendar/components/modal/calendar-task-deadline-fields.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/calendar-time-fields.tsx](../frontend/web/features/calendar/components/modal/calendar-time-fields.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/custom-recurrence-modal.tsx](../frontend/web/features/calendar/components/modal/custom-recurrence-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/delete-calendar-modal.tsx](../frontend/web/features/calendar/components/modal/delete-calendar-modal.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/event-attendee-list.tsx](../frontend/web/features/calendar/components/modal/event-attendee-list.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/event-detail-modal.tsx](../frontend/web/features/calendar/components/modal/event-detail-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/event-form-modal.tsx](../frontend/web/features/calendar/components/modal/event-form-modal.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/location-picker-input.tsx](../frontend/web/features/calendar/components/modal/location-picker-input.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/project-task-detail-modal.tsx](../frontend/web/features/calendar/components/modal/project-task-detail-modal.tsx) | change | normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/quick-create-event-fields.tsx](../frontend/web/features/calendar/components/modal/quick-create-event-fields.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/quick-create-modal.tsx](../frontend/web/features/calendar/components/modal/quick-create-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/quick-create-time-section.tsx](../frontend/web/features/calendar/components/modal/quick-create-time-section.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/recurrence-scope-modal.tsx](../frontend/web/features/calendar/components/modal/recurrence-scope-modal.tsx) | change | remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/modal/reminder-editor.tsx](../frontend/web/features/calendar/components/modal/reminder-editor.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/calendar-color-popover.tsx](../frontend/web/features/calendar/components/sidebar/calendar-color-popover.tsx) | functional/content exception | Surrounding presentation normalized. Preserve user-selected fills, swatches, emoji/project identity, and avatar geometry; normalize only surrounding interface presentation. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/calendar-list-item.tsx](../frontend/web/features/calendar/components/sidebar/calendar-list-item.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/calendar-sidebar.tsx](../frontend/web/features/calendar/components/sidebar/calendar-sidebar.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/calendar-style-fields.tsx](../frontend/web/features/calendar/components/sidebar/calendar-style-fields.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/mini-calendar.tsx](../frontend/web/features/calendar/components/sidebar/mini-calendar.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/project-calendars-section.tsx](../frontend/web/features/calendar/components/sidebar/project-calendars-section.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/sidebar/tasks-calendar-list-item.tsx](../frontend/web/features/calendar/components/sidebar/tasks-calendar-list-item.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/toolbar/calendar-toolbar.tsx](../frontend/web/features/calendar/components/toolbar/calendar-toolbar.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/ui/calendar-confirm-dialog.tsx](../frontend/web/features/calendar/components/ui/calendar-confirm-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/ui/calendar-radio-group.tsx](../frontend/web/features/calendar/components/ui/calendar-radio-group.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/workspace/attendee-picker.tsx](../frontend/web/features/calendar/components/workspace/attendee-picker.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/workspace/calendar-grid.tsx](../frontend/web/features/calendar/components/workspace/calendar-grid.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/calendar/components/workspace/calendar-workspace.tsx](../frontend/web/features/calendar/components/workspace/calendar-workspace.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/chat-area/chat-area.tsx](../frontend/web/features/chat/components/chat-area/chat-area.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/chat-area/editing-banner.tsx](../frontend/web/features/chat/components/chat-area/editing-banner.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/chat-area/jump-to-recent-banner.tsx](../frontend/web/features/chat/components/chat-area/jump-to-recent-banner.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/chat-layout.tsx](../frontend/web/features/chat/components/chat-layout.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/header/channel-chat-header.tsx](../frontend/web/features/chat/components/header/channel-chat-header.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/header/chat-header.tsx](../frontend/web/features/chat/components/header/chat-header.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/header/direct-conversation-header.tsx](../frontend/web/features/chat/components/header/direct-conversation-header.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/input/channel-chat-input.tsx](../frontend/web/features/chat/components/input/channel-chat-input.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/input/direct-message-input.tsx](../frontend/web/features/chat/components/input/direct-message-input.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/input/emoji-picker-popover.tsx](../frontend/web/features/chat/components/input/emoji-picker-popover.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/input/mention-dropdown.tsx](../frontend/web/features/chat/components/input/mention-dropdown.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/input/rich-text-textarea.tsx](../frontend/web/features/chat/components/input/rich-text-textarea.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/input/thread-chat-input.tsx](../frontend/web/features/chat/components/input/thread-chat-input.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/chat-message.tsx](../frontend/web/features/chat/components/message/chat-message.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/document-message.tsx](../frontend/web/features/chat/components/message/document-message.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/media-lightbox.tsx](../frontend/web/features/chat/components/message/media-lightbox.tsx) | functional/content exception | Surrounding presentation normalized. Preserve intrinsic media/reaction content and functional viewing controls; dark media overlays support legibility. Ordinary surrounding UI follows shared rules. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/meeting-card-message.tsx](../frontend/web/features/chat/components/message/meeting-card-message.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/message-attachments.tsx](../frontend/web/features/chat/components/message/message-attachments.tsx) | change | use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/message-avatar.tsx](../frontend/web/features/chat/components/message/message-avatar.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/message-list.tsx](../frontend/web/features/chat/components/message/message-list.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/message-options-dropdown.tsx](../frontend/web/features/chat/components/message/message-options-dropdown.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/message-reactions.tsx](../frontend/web/features/chat/components/message/message-reactions.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/message-read-receipts.tsx](../frontend/web/features/chat/components/message/message-read-receipts.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/note-message.tsx](../frontend/web/features/chat/components/message/note-message.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/poll-message.tsx](../frontend/web/features/chat/components/message/poll-message.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/task-card-message.tsx](../frontend/web/features/chat/components/message/task-card-message.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/time-divider.tsx](../frontend/web/features/chat/components/message/time-divider.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/message/typing-indicator.tsx](../frontend/web/features/chat/components/message/typing-indicator.tsx) | change | Static typing feedback with readable status text replaces bouncing dots. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/channel/browse-channels-modal.tsx](../frontend/web/features/chat/components/modals/channel/browse-channels-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/channel/channel-member-row.tsx](../frontend/web/features/chat/components/modals/channel/channel-member-row.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/channel/channel-members-list.tsx](../frontend/web/features/chat/components/modals/channel/channel-members-list.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/channel/channel-members-modal.tsx](../frontend/web/features/chat/components/modals/channel/channel-members-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/channel/channel-settings-modal.tsx](../frontend/web/features/chat/components/modals/channel/channel-settings-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/channel/create-channel-modal.tsx](../frontend/web/features/chat/components/modals/channel/create-channel-modal.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/create-note-modal.tsx](../frontend/web/features/chat/components/modals/message/create-note-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/create-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/create-poll-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/edit-note-modal.tsx](../frontend/web/features/chat/components/modals/message/edit-note-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/edit-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/edit-poll-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/poll-voters-modal.tsx](../frontend/web/features/chat/components/modals/message/poll-voters-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/reaction-detail-modal.tsx](../frontend/web/features/chat/components/modals/message/reaction-detail-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/view-note-modal.tsx](../frontend/web/features/chat/components/modals/message/view-note-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/message/view-poll-modal.tsx](../frontend/web/features/chat/components/modals/message/view-poll-modal.tsx) | change | normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/shared/my-files-select-modal.tsx](../frontend/web/features/chat/components/modals/shared/my-files-select-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/shared/search-user-modal.tsx](../frontend/web/features/chat/components/modals/shared/search-user-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/shared/user-profile-modal.tsx](../frontend/web/features/chat/components/modals/shared/user-profile-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/create-space-modal.tsx](../frontend/web/features/chat/components/modals/space/create-space-modal.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/invite-space-members-modal.tsx](../frontend/web/features/chat/components/modals/space/invite-space-members-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/manage-members-modal.tsx](../frontend/web/features/chat/components/modals/space/manage-members-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings-modal.tsx](../frontend/web/features/chat/components/modals/space/space-settings-modal.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings/danger-zone-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/danger-zone-tab.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings/invitations-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/invitations-tab.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings/members-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/members-tab.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings/overview-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/overview-tab.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings/permissions-tab.tsx](../frontend/web/features/chat/components/modals/space/space-settings/permissions-tab.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/space/space-settings/space-settings-modal.tsx](../frontend/web/features/chat/components/modals/space/space-settings/space-settings-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/modals/start-meeting-confirm-modal.tsx](../frontend/web/features/chat/components/modals/start-meeting-confirm-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/channel/channel-actions-section.tsx](../frontend/web/features/chat/components/right-panel/channel/channel-actions-section.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/channel/channel-right-panel.tsx](../frontend/web/features/chat/components/right-panel/channel/channel-right-panel.tsx) | change | use ordinary semibold UI emphasis; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/channel/channel-settings-section.tsx](../frontend/web/features/chat/components/right-panel/channel/channel-settings-section.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/chat-right-panel.tsx](../frontend/web/features/chat/components/right-panel/chat-right-panel.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/direct-message/direct-message-right-panel.tsx](../frontend/web/features/chat/components/right-panel/direct-message/direct-message-right-panel.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; name icon controls; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/files/files-section.tsx](../frontend/web/features/chat/components/right-panel/files/files-section.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/files/media-detail-view.tsx](../frontend/web/features/chat/components/right-panel/files/media-detail-view.tsx) | change | normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/notes/note-detail-view.tsx](../frontend/web/features/chat/components/right-panel/notes/note-detail-view.tsx) | change | normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/notes/notes-section.tsx](../frontend/web/features/chat/components/right-panel/notes/notes-section.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx](../frontend/web/features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx) | change | normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/pinned-messages/pinned-messages-section.tsx](../frontend/web/features/chat/components/right-panel/pinned-messages/pinned-messages-section.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/polls/poll-detail-view.tsx](../frontend/web/features/chat/components/right-panel/polls/poll-detail-view.tsx) | change | normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/polls/polls-section.tsx](../frontend/web/features/chat/components/right-panel/polls/polls-section.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/search/search-messages-section.tsx](../frontend/web/features/chat/components/right-panel/search/search-messages-section.tsx) | change | remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/search/search-result-item.tsx](../frontend/web/features/chat/components/right-panel/search/search-result-item.tsx) | change | replace decorative gradients with semantic fills; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/see-all-button.tsx](../frontend/web/features/chat/components/right-panel/see-all-button.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/thread/thread-detail-view.tsx](../frontend/web/features/chat/components/right-panel/thread/thread-detail-view.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/thread/thread-side-panel.tsx](../frontend/web/features/chat/components/right-panel/thread/thread-side-panel.tsx) | change | name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/thread/thread-snippet-preview.tsx](../frontend/web/features/chat/components/right-panel/thread/thread-snippet-preview.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/thread/threads-list-view.tsx](../frontend/web/features/chat/components/right-panel/thread/threads-list-view.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/right-panel/thread/threads-section.tsx](../frontend/web/features/chat/components/right-panel/thread/threads-section.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/sidebar/channel-item.tsx](../frontend/web/features/chat/components/sidebar/channel-item.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/sidebar/chat-sidebar.tsx](../frontend/web/features/chat/components/sidebar/chat-sidebar.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/sidebar/direct-conversation-item.tsx](../frontend/web/features/chat/components/sidebar/direct-conversation-item.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/sidebar/direct-conversations-section.tsx](../frontend/web/features/chat/components/sidebar/direct-conversations-section.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/sidebar/followed-threads-modal.tsx](../frontend/web/features/chat/components/sidebar/followed-threads-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/ui/chat-confirm-dialog.tsx](../frontend/web/features/chat/components/ui/chat-confirm-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/ui/chat-empty-state.tsx](../frontend/web/features/chat/components/ui/chat-empty-state.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/ui/chat-form-controls.tsx](../frontend/web/features/chat/components/ui/chat-form-controls.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/ui/chat-input-modal.tsx](../frontend/web/features/chat/components/ui/chat-input-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/components/ui/chat-loading-state.tsx](../frontend/web/features/chat/components/ui/chat-loading-state.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/utils/document-utils.tsx](../frontend/web/features/chat/utils/document-utils.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/utils/media-utils.tsx](../frontend/web/features/chat/utils/media-utils.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/chat/utils/message-formatter.tsx](../frontend/web/features/chat/utils/message-formatter.tsx) | functional/content exception | Semantic message headings, emphasis, code, and blockquotes are user content. Preserve formatting exactly; the blockquote border is the documented detector exception. | Source equality verified; chat rendering exercised. |
| [features/dashboard/components/overview/dashboard-extras.tsx](../frontend/web/features/dashboard/components/overview/dashboard-extras.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/dashboard-focus.tsx](../frontend/web/features/dashboard/components/dashboard-focus.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/overview/dashboard-meetings.tsx](../frontend/web/features/dashboard/components/overview/dashboard-meetings.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/overview/dashboard-notification-dialog.tsx](../frontend/web/features/dashboard/components/overview/dashboard-notification-dialog.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/common/dashboard-panel.tsx](../frontend/web/features/dashboard/components/common/dashboard-panel.tsx) | change | use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/productivity/dashboard-productivity-chart.tsx](../frontend/web/features/dashboard/components/productivity/dashboard-productivity-chart.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/productivity/dashboard-productivity.tsx](../frontend/web/features/dashboard/components/productivity/dashboard-productivity.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/productivity/dashboard-project-activity.tsx](../frontend/web/features/dashboard/components/productivity/dashboard-project-activity.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/overview/dashboard-quick-actions.tsx](../frontend/web/features/dashboard/components/overview/dashboard-quick-actions.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/weather/dashboard-sun.tsx](../frontend/web/features/dashboard/components/weather/dashboard-sun.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/tasks/dashboard-tasks.tsx](../frontend/web/features/dashboard/components/tasks/dashboard-tasks.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/dashboard/components/dashboard-view.tsx](../frontend/web/features/dashboard/components/dashboard-view.tsx) | change | use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/common/document-icon.tsx](../frontend/web/features/documents/components/common/document-icon.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/common/folder-picker-modal.tsx](../frontend/web/features/documents/components/common/folder-picker-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/common/quota-widget.tsx](../frontend/web/features/documents/components/common/quota-widget.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/common/shimmer-loader.tsx](../frontend/web/features/documents/components/common/shimmer-loader.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/common/upload-progress.tsx](../frontend/web/features/documents/components/common/upload-progress.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/document-explorer.tsx](../frontend/web/features/documents/components/document-explorer.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; use opaque application surfaces; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/documents-view.tsx](../frontend/web/features/documents/components/documents-view.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/download/download-queue-provider.tsx](../frontend/web/features/documents/components/download/download-queue-provider.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; routed app composition exercised. |
| [features/documents/components/explorer/breadcrumb-link.tsx](../frontend/web/features/documents/components/explorer/breadcrumb-link.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/explorer/details-panel.tsx](../frontend/web/features/documents/components/explorer/details-panel.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/explorer/documents-sidebar-storage-panel.tsx](../frontend/web/features/documents/components/explorer/documents-sidebar-storage-panel.tsx) | change | Restrained storage metrics and actual quota progress replace the primary-colored banner. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/explorer/documents-sidebar.tsx](../frontend/web/features/documents/components/explorer/documents-sidebar.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/explorer/explorer-breadcrumbs.tsx](../frontend/web/features/documents/components/explorer/explorer-breadcrumbs.tsx) | change | normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/explorer/explorer-toolbar.tsx](../frontend/web/features/documents/components/explorer/explorer-toolbar.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/explorer/item-actions-menu.tsx](../frontend/web/features/documents/components/explorer/item-actions-menu.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/preview/file-preview-modal.tsx](../frontend/web/features/documents/components/preview/file-preview-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/preview/preview-content.tsx](../frontend/web/features/documents/components/preview/preview-content.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/sharing/share-form.tsx](../frontend/web/features/documents/components/sharing/share-form.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/sharing/share-link.tsx](../frontend/web/features/documents/components/sharing/share-link.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/sharing/share-list.tsx](../frontend/web/features/documents/components/sharing/share-list.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/sharing/share-modal.tsx](../frontend/web/features/documents/components/sharing/share-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/sharing/share-suggestions-dropdown.tsx](../frontend/web/features/documents/components/sharing/share-suggestions-dropdown.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/sharing/share-to-chat-modal.tsx](../frontend/web/features/documents/components/sharing/share-to-chat-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-card.tsx](../frontend/web/features/documents/components/ui/documents-card.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-confirm-dialog.tsx](../frontend/web/features/documents/components/ui/documents-confirm-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-empty-state.tsx](../frontend/web/features/documents/components/ui/documents-empty-state.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-form-controls.tsx](../frontend/web/features/documents/components/ui/documents-form-controls.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-icon-button.tsx](../frontend/web/features/documents/components/ui/documents-icon-button.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-input-modal.tsx](../frontend/web/features/documents/components/ui/documents-input-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-loading-state.tsx](../frontend/web/features/documents/components/ui/documents-loading-state.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-pagination.tsx](../frontend/web/features/documents/components/ui/documents-pagination.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/ui/documents-status-badge.tsx](../frontend/web/features/documents/components/ui/documents-status-badge.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/versions/version-history-table.tsx](../frontend/web/features/documents/components/versions/version-history-table.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/versions/version-management-modal.tsx](../frontend/web/features/documents/components/versions/version-management-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/versions/version-uploader.tsx](../frontend/web/features/documents/components/versions/version-uploader.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/views/grid-view-card.tsx](../frontend/web/features/documents/components/views/grid-view-card.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/views/grid-view.tsx](../frontend/web/features/documents/components/views/grid-view.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/views/list-view-row.tsx](../frontend/web/features/documents/components/views/list-view-row.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/documents/components/views/list-view.tsx](../frontend/web/features/documents/components/views/list-view.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/avatar-fallback.tsx](../frontend/web/features/meeting/components/common/avatar-fallback.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-action-tile.tsx](../frontend/web/features/meeting/components/common/meeting-action-tile.tsx) | change | New meeting is primary; ordinary actions use restrained card controls with unchanged props. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-alert-dialog.tsx](../frontend/web/features/meeting/components/common/meeting-alert-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-auto-admit-toggle.tsx](../frontend/web/features/meeting/components/common/meeting-auto-admit-toggle.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-device-select.tsx](../frontend/web/features/meeting/components/common/meeting-device-select.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-hero.tsx](../frontend/web/features/meeting/components/common/meeting-hero.tsx) | change | Compact date/time/upcoming header replaces the decorative clock composition. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-icon-dropdown.tsx](../frontend/web/features/meeting/components/common/meeting-icon-dropdown.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-join-link-modal.tsx](../frontend/web/features/meeting/components/common/meeting-join-link-modal.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-pagination.tsx](../frontend/web/features/meeting/components/common/meeting-pagination.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-participant-chat-toggle.tsx](../frontend/web/features/meeting/components/common/meeting-participant-chat-toggle.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-participant-list-item.tsx](../frontend/web/features/meeting/components/common/meeting-participant-list-item.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-room-control-button.tsx](../frontend/web/features/meeting/components/common/meeting-room-control-button.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-screen-share-toggle.tsx](../frontend/web/features/meeting/components/common/meeting-screen-share-toggle.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/common/meeting-status-tag.tsx](../frontend/web/features/meeting/components/common/meeting-status-tag.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/history/meeting-history-avatar-stack.tsx](../frontend/web/features/meeting/components/history/meeting-history-avatar-stack.tsx) | functional/content exception | Surrounding presentation normalized. Preserve user-selected fills, swatches, emoji/project identity, and avatar geometry; normalize only surrounding interface presentation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/history/meeting-history-card.tsx](../frontend/web/features/meeting/components/history/meeting-history-card.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/history/meeting-history-list-row.tsx](../frontend/web/features/meeting/components/history/meeting-history-list-row.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/history/meeting-join-token-copy-button.tsx](../frontend/web/features/meeting/components/history/meeting-join-token-copy-button.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/history/meeting-previous-view.tsx](../frontend/web/features/meeting/components/history/meeting-previous-view.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/meeting-layout.tsx](../frontend/web/features/meeting/components/meeting-layout.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/meeting-sidebar-stats-panel.tsx](../frontend/web/features/meeting/components/meeting-sidebar-stats-panel.tsx) | change | Flat real meeting metrics replace the oversized banner and nested tiles. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/meeting-sidebar.tsx](../frontend/web/features/meeting/components/meeting-sidebar.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/recordings/meeting-recording-player.tsx](../frontend/web/features/meeting/components/recordings/meeting-recording-player.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/recordings/meeting-recording-share-dialog.tsx](../frontend/web/features/meeting/components/recordings/meeting-recording-share-dialog.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/recordings/meeting-recordings-view.tsx](../frontend/web/features/meeting/components/recordings/meeting-recordings-view.tsx) | change | use ordinary semibold UI emphasis; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/room/meeting-access-denied.tsx](../frontend/web/features/meeting/components/room/meeting-access-denied.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-fullscreen-overlay.tsx](../frontend/web/features/meeting/components/room/meeting-fullscreen-overlay.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; use shared heading roles. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-participant-tile.tsx](../frontend/web/features/meeting/components/room/meeting-participant-tile.tsx) | functional/content exception | Surrounding presentation normalized. Preserve intrinsic media/reaction content and functional viewing controls; dark media overlays support legibility. Ordinary surrounding UI follows shared rules. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-password-gate.tsx](../frontend/web/features/meeting/components/room/meeting-password-gate.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; use shared heading roles. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-prejoin.tsx](../frontend/web/features/meeting/components/room/meeting-prejoin.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; use shared heading roles. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-recording-banner.tsx](../frontend/web/features/meeting/components/room/meeting-recording-banner.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-recording-controls.tsx](../frontend/web/features/meeting/components/room/meeting-recording-controls.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-audio-renderer.tsx](../frontend/web/features/meeting/components/room/meeting-room-audio-renderer.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-content.tsx](../frontend/web/features/meeting/components/room/meeting-room-content.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-footer.tsx](../frontend/web/features/meeting/components/room/meeting-room-footer.tsx) | change | use opaque application surfaces. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-reaction-overlay.tsx](../frontend/web/features/meeting/components/room/meeting-room-reaction-overlay.tsx) | functional/content exception | Surrounding presentation normalized. Preserve intrinsic media/reaction content and functional viewing controls; dark media overlays support legibility. Ordinary surrounding UI follows shared rules. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-reaction-picker.tsx](../frontend/web/features/meeting/components/room/meeting-room-reaction-picker.tsx) | functional/content exception | Surrounding presentation normalized. Preserve intrinsic media/reaction content and functional viewing controls; dark media overlays support legibility. Ordinary surrounding UI follows shared rules. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-shell.tsx](../frontend/web/features/meeting/components/room/meeting-room-shell.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-stage.tsx](../frontend/web/features/meeting/components/room/meeting-room-stage.tsx) | change | remove custom/persistent elevation. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-room-state.tsx](../frontend/web/features/meeting/components/room/meeting-room-state.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-waiting-approval.tsx](../frontend/web/features/meeting/components/room/meeting-waiting-approval.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; use shared heading roles. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/meeting-waiting-host.tsx](../frontend/web/features/meeting/components/room/meeting-waiting-host.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-attachments.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-attachments.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; name icon controls. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-editing-banner.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-editing-banner.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-input.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-input.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-item.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-item.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-list.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-list.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-options-menu.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-options-menu.tsx) | change | remove custom/persistent elevation. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-reactions.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-reactions.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-read-receipts.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-read-receipts.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/message/meeting-message-time-divider.tsx](../frontend/web/features/meeting/components/room/message/meeting-message-time-divider.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-chat-notification-toggle-button.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-chat-notification-toggle-button.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-participants-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-participants-panel.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-chat-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-chat-panel.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-desktop-side-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-desktop-side-panel.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-mobile-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-mobile-panel.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-panel-content.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-panel-content.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-settings-panel.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-settings-panel.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/room/side-panel/meeting-room-share-link.tsx](../frontend/web/features/meeting/components/room/side-panel/meeting-room-share-link.tsx) | change | use ordinary semibold UI emphasis. | Source review; room gates rendered; connected media not exercised. |
| [features/meeting/components/schedule/schedule-meeting-modal.tsx](../frontend/web/features/meeting/components/schedule/schedule-meeting-modal.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/schedule/upcoming-meeting-card.tsx](../frontend/web/features/meeting/components/schedule/upcoming-meeting-card.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/schedule/upcoming-meetings-view.tsx](../frontend/web/features/meeting/components/schedule/upcoming-meetings-view.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-card.tsx](../frontend/web/features/meeting/components/ui/meeting-card.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-empty-state.tsx](../frontend/web/features/meeting/components/ui/meeting-empty-state.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-field.tsx](../frontend/web/features/meeting/components/ui/meeting-field.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-form-controls.tsx](../frontend/web/features/meeting/components/ui/meeting-form-controls.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-icon-button.tsx](../frontend/web/features/meeting/components/ui/meeting-icon-button.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-loading-state.tsx](../frontend/web/features/meeting/components/ui/meeting-loading-state.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-status-badge.tsx](../frontend/web/features/meeting/components/ui/meeting-status-badge.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/meeting/components/ui/meeting-toggle.tsx](../frontend/web/features/meeting/components/ui/meeting-toggle.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/chat-message-alert-manager.tsx](../frontend/web/features/notification/components/chat-message-alert-manager.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/notification-category-icon.tsx](../frontend/web/features/notification/components/notification-category-icon.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/notification-detail-modal.tsx](../frontend/web/features/notification/components/notification-detail-modal.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/notification-item.tsx](../frontend/web/features/notification/components/notification-item.tsx) | change | remove custom/persistent elevation. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/notification-list.tsx](../frontend/web/features/notification/components/notification-list.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/notification-managers.tsx](../frontend/web/features/notification/components/notification-managers.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/push-subscription-manager.tsx](../frontend/web/features/notification/components/push-subscription-manager.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/calendar-reminder-renderer.tsx](../frontend/web/features/notification/components/renderers/calendar-reminder-renderer.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/default-renderer.tsx](../frontend/web/features/notification/components/renderers/default-renderer.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/invitation-accepted-renderer.tsx](../frontend/web/features/notification/components/renderers/invitation-accepted-renderer.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/invitation-declined-renderer.tsx](../frontend/web/features/notification/components/renderers/invitation-declined-renderer.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/invitation-renderer.tsx](../frontend/web/features/notification/components/renderers/invitation-renderer.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/meeting-invitation-renderer.tsx](../frontend/web/features/notification/components/renderers/meeting-invitation-renderer.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/renderers/project-invitation-renderer.tsx](../frontend/web/features/notification/components/renderers/project-invitation-renderer.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/service-worker-navigation-listener.tsx](../frontend/web/features/notification/components/service-worker-navigation-listener.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/notification/components/space-notification-alert-manager.tsx](../frontend/web/features/notification/components/space-notification-alert-manager.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-active-task.tsx](../frontend/web/features/pomodoro/components/pomodoro-active-task.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-ambient-player.tsx](../frontend/web/features/pomodoro/components/pomodoro-ambient-player.tsx) | change | use ordinary semibold UI emphasis; replace decorative bounce with static feedback; use opaque application surfaces; remove custom/persistent elevation; replace decorative gradients with semantic fills; normalize semantic corners; name icon controls. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-audio-icon.tsx](../frontend/web/features/pomodoro/components/pomodoro-audio-icon.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-audio-track-list.tsx](../frontend/web/features/pomodoro/components/pomodoro-audio-track-list.tsx) | change | use ordinary semibold UI emphasis; replace decorative gradients with semantic fills; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-calendar-task-form.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-form.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-calendar-task-list.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-list.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-calendar-task-panel.tsx](../frontend/web/features/pomodoro/components/pomodoro-calendar-task-panel.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-config-provider.tsx](../frontend/web/features/pomodoro/components/pomodoro-config-provider.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; routed app composition exercised. |
| [features/pomodoro/components/pomodoro-controls.tsx](../frontend/web/features/pomodoro/components/pomodoro-controls.tsx) | change | One dominant start/resume action; secondary reset/skip and readable pending/disabled states. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-daily-stats.tsx](../frontend/web/features/pomodoro/components/pomodoro-daily-stats.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-focus-dialog.tsx](../frontend/web/features/pomodoro/components/pomodoro-focus-dialog.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-focus-switch-confirmation.tsx](../frontend/web/features/pomodoro/components/pomodoro-focus-switch-confirmation.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-mini-timer.tsx](../frontend/web/features/pomodoro/components/pomodoro-mini-timer.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-project-task-panel.tsx](../frontend/web/features/pomodoro/components/pomodoro-project-task-panel.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-report.tsx](../frontend/web/features/pomodoro/components/pomodoro-report.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-session-history-item.tsx](../frontend/web/features/pomodoro/components/pomodoro-session-history-item.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-session-history.tsx](../frontend/web/features/pomodoro/components/pomodoro-session-history.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-session-provider.tsx](../frontend/web/features/pomodoro/components/pomodoro-session-provider.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; routed app composition exercised. |
| [features/pomodoro/components/pomodoro-settings-form.tsx](../frontend/web/features/pomodoro/components/pomodoro-settings-form.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-stats-card.tsx](../frontend/web/features/pomodoro/components/pomodoro-stats-card.tsx) | change | Flat metrics and real goal progress replace emoji and nested gradient cards. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-task-actions.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-actions.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-task-editor.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-editor.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-task-filters.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-filters.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-task-picker.tsx](../frontend/web/features/pomodoro/components/pomodoro-task-picker.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-timer-display.tsx](../frontend/web/features/pomodoro/components/pomodoro-timer-display.tsx) | change | Keep functional elapsed-time ring, timer, modes, and task context; remove ornamental ticks and glow. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/pomodoro-view.tsx](../frontend/web/features/pomodoro/components/pomodoro-view.tsx) | change | use ordinary semibold UI emphasis; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/task-focus-button.tsx](../frontend/web/features/pomodoro/components/task-focus-button.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/pomodoro/components/task-focus-history.tsx](../frontend/web/features/pomodoro/components/task-focus-history.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/create-project-dialog.tsx](../frontend/web/features/project/components/dialogs/create-project-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/invite-member-dialog.tsx](../frontend/web/features/project/components/dialogs/invite-member-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/member-permissions-dialog.tsx](../frontend/web/features/project/components/dialogs/member-permissions-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/project-settings-dialog.tsx](../frontend/web/features/project/components/dialogs/project-settings-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/select-task-channel-dialog.tsx](../frontend/web/features/project/components/dialogs/select-task-channel-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/task-chat-dialog.tsx](../frontend/web/features/project/components/dialogs/task-chat-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/dialogs/task-form-dialog.tsx](../frontend/web/features/project/components/dialogs/task-form-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/forms/project-label-manager.tsx](../frontend/web/features/project/components/forms/project-label-manager.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/forms/task-date-range-fields.tsx](../frontend/web/features/project/components/forms/task-date-range-fields.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/forms/task-details-fields.tsx](../frontend/web/features/project/components/forms/task-details-fields.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/layout/project-detail-content.tsx](../frontend/web/features/project/components/layout/project-detail-content.tsx) | change | normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/layout/project-detail-fallback.tsx](../frontend/web/features/project/components/layout/project-detail-fallback.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/layout/project-detail-sidebar.tsx](../frontend/web/features/project/components/layout/project-detail-sidebar.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/layout/project-detail-toolbar.tsx](../frontend/web/features/project/components/layout/project-detail-toolbar.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/list/project-task-row.tsx](../frontend/web/features/project/components/list/project-task-row.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/list/task-inline-creator.tsx](../frontend/web/features/project/components/list/task-inline-creator.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/members/pending-invitations-list.tsx](../frontend/web/features/project/components/members/pending-invitations-list.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/members/project-members-panel.tsx](../frontend/web/features/project/components/members/project-members-panel.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/project-realtime-manager.tsx](../frontend/web/features/project/components/project-realtime-manager.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/summary/member-workload-list.tsx](../frontend/web/features/project/components/summary/member-workload-list.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/summary/priority-distribution-bar.tsx](../frontend/web/features/project/components/summary/priority-distribution-bar.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/summary/project-metric-card.tsx](../frontend/web/features/project/components/summary/project-metric-card.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/summary/project-summary-panel.tsx](../frontend/web/features/project/components/summary/project-summary-panel.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-activity-panel.tsx](../frontend/web/features/project/components/task-detail/task-activity-panel.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-checklist-section.tsx](../frontend/web/features/project/components/task-detail/task-checklist-section.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-comments-section.tsx](../frontend/web/features/project/components/task-detail/task-comments-section.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-dependencies-section.tsx](../frontend/web/features/project/components/task-detail/task-dependencies-section.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-detail-drawer.tsx](../frontend/web/features/project/components/task-detail/task-detail-drawer.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-documents-section.tsx](../frontend/web/features/project/components/task-detail/task-documents-section.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-labels-picker.tsx](../frontend/web/features/project/components/task-detail/task-labels-picker.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-properties-panel.tsx](../frontend/web/features/project/components/task-detail/task-properties-panel.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-status-picker.tsx](../frontend/web/features/project/components/task-detail/task-status-picker.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/task-detail/task-subtasks-section.tsx](../frontend/web/features/project/components/task-detail/task-subtasks-section.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/avatar-stack.tsx](../frontend/web/features/project/components/ui/avatar-stack.tsx) | functional/content exception | Surrounding presentation normalized. Preserve user-selected fills, swatches, emoji/project identity, and avatar geometry; normalize only surrounding interface presentation. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/project-confirm-dialog.tsx](../frontend/web/features/project/components/ui/project-confirm-dialog.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/project-form-controls.tsx](../frontend/web/features/project/components/ui/project-form-controls.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/project-preview-card.tsx](../frontend/web/features/project/components/ui/project-preview-card.tsx) | functional/content exception | Surrounding presentation normalized. Preserve user-selected fills, swatches, emoji/project identity, and avatar geometry; normalize only surrounding interface presentation. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/status-badge.tsx](../frontend/web/features/project/components/ui/status-badge.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/task-card.tsx](../frontend/web/features/project/components/ui/task-card.tsx) | change | remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/task-chat-button.tsx](../frontend/web/features/project/components/ui/task-chat-button.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/task-label-badges.tsx](../frontend/web/features/project/components/ui/task-label-badges.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/ui/task-quick-filters.tsx](../frontend/web/features/project/components/ui/task-quick-filters.tsx) | change | Responsive stacked filters, constrained widths, and preserved status/priority/assignee selection and reset. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/board-view.tsx](../frontend/web/features/project/components/views/board-view.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/calendar-view.tsx](../frontend/web/features/project/components/views/calendar-view.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/gantt-view.tsx](../frontend/web/features/project/components/views/gantt-view.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/list-view.tsx](../frontend/web/features/project/components/views/list-view.tsx) | change | use ordinary semibold UI emphasis; use opaque application surfaces; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/project-documents-view.tsx](../frontend/web/features/project/components/views/project-documents-view.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/project-members-view.tsx](../frontend/web/features/project/components/views/project-members-view.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/project/components/views/summary-view.tsx](../frontend/web/features/project/components/views/summary-view.tsx) | change | use ordinary semibold UI emphasis. | Source review; feature-family route/state checks (not every branch). |
| [features/project/screens/project-detail-screen.tsx](../frontend/web/features/project/screens/project-detail-screen.tsx) | change | Normalize compact typography, semantic surfaces, corners, or functional feedback; preserve component props and feature behavior. | Source review; feature-family route/state checks (not every branch). |
| [features/project/screens/project-invitations-screen.tsx](../frontend/web/features/project/screens/project-invitations-screen.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/account-theme-sync.tsx](../frontend/web/features/user-setting/components/account-theme-sync.tsx) | keep | Existing compact semantic styling and functional content fit the targeted simplification; no additional presentation change justified. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/password-input.tsx](../frontend/web/features/user-setting/components/password-input.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/password-tab.tsx](../frontend/web/features/user-setting/components/password-tab.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/pomodoro-tab.tsx](../frontend/web/features/user-setting/components/pomodoro-tab.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/profile-tab.tsx](../frontend/web/features/user-setting/components/profile-tab.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/revoke-session-modal.tsx](../frontend/web/features/user-setting/components/revoke-session-modal.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/sessions-tab.tsx](../frontend/web/features/user-setting/components/sessions-tab.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/settings-tab.tsx](../frontend/web/features/user-setting/components/settings-tab.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/ui/setting-form-controls.tsx](../frontend/web/features/user-setting/components/ui/setting-form-controls.tsx) | change | use ordinary semibold UI emphasis; normalize semantic corners. | Source review; feature-family route/state checks (not every branch). |
| [features/user-setting/components/user-settings-modal.tsx](../frontend/web/features/user-setting/components/user-settings-modal.tsx) | change | use ordinary semibold UI emphasis; remove custom/persistent elevation; normalize semantic corners; use shared heading roles. | Source review; feature-family route/state checks (not every branch). |
| [store/query-provider.tsx](../frontend/web/store/query-provider.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; routed app composition exercised. |
| [store/store-provider.tsx](../frontend/web/store/store-provider.tsx) | keep | Provider/state composition retains existing ownership and behavior; no independent decorative surface needs changing. | Source review; routed app composition exercised. |
