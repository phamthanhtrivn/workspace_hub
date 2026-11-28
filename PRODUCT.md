# WorkspaceHub

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

WorkspaceHub primarily serves students and small teams coordinating study, thesis work, and shared projects. Individuals use the same workspace for daily planning and focus. Professional teams are a secondary audience.

## Product Purpose

Bring tasks, schedules, conversations, documents, meetings, and focused work into one workspace. Success means a member can understand today's commitments, find related information, and act without repeatedly switching tools.

## Positioning

The product connects personal productivity with team collaboration. Project tasks can appear alongside personal commitments in the calendar and dashboard; conversations, documents, and meetings provide context around the work. Describe these connections through working features, without inventing customer evidence or performance claims.

## Operating Context

- Members sign in with an account, manage personal work, and join projects and communication spaces with different permissions.
- The dashboard brings together today's timeline, personal and assigned tasks, upcoming meetings, focus sessions, active projects, recent AI notebooks, recent documents & storage, and notifications.
- Project work supports board, list, calendar, Gantt, summary, and member views, with task details in a drawer.
- Real-time conversations include direct messages, channels, threads, reactions, attachments, polls, notes, and linked task/document content.
- Calendar work includes personal events and tasks, project calendars, recurrence, reminders, upcoming deadlines, and attendee responses.
- Documents support folders, upload/download, floating upload progress, versions (including manual current version selection), previews, multi-DM/channel copy sending, sharing, and public links with access checks.
- Meetings include scheduling, joining, device preview, video and screen sharing, participants, chat, and recording management.
- Pomodoro supports focus/break cycles, Fullscreen Zen Mode, session notes, task association, session history/reports, and ambient audio.

## Capabilities and Constraints

The implemented frontend is a Next.js App Router application using React, TypeScript, Tailwind CSS, shared UI primitives, React Query, Redux, FullCalendar, Recharts, and LiveKit. Keep server requests in feature API modules and server state in React Query. Redux owns existing global authentication, chat, and notification state.

The `/ai` page provides personal notebooks with authorized document sources, cited Q&A, notes and summaries. Task functionality exists in projects, calendar and dashboard; the standalone `/tasks` route is not a replacement for those workflows. Conversation assistance, Work Assistant, meeting summaries and voice transcription depend on configured services and feature flags. Flashcards and quizzes remain outside the implemented feature set.

Permissions, recurrence expansion, recording ownership, and durable operations remain backend responsibilities. Present only actions permitted by the current user. Preserve API contracts, identifiers, notification links, user-selected colors, timezone behavior, and source-specific task actions.

Dashboard constraints: aggregate existing APIs, preserve task source/occurrence identity, include overdue and undated tasks, avoid counting cancelled tasks as completed progress, and reuse the existing Pomodoro providers. Each widget needs its own loading, empty, error, and retry state. Advanced analytics, an AI daily brief, and draggable/customizable dashboard widgets remain future work. Prior dashboard browser checks used intercepted APIs; live backend verification is still required for end-to-end permissions, invitation, upload, and focus workflows.

## Brand Commitments

Use the existing WorkspaceHub name, assets, and clear action-oriented English interface copy. The supplied brand palette is midnight (`#010736`), navy (`#0D1C42`), blue (`#22396F`), and ice blue (`#E6EDF8`). The approved interface uses VS Code Modern-inspired neutral light and charcoal dark surfaces, gray text, navy actions (deeper navy in Dark), and muted semantic status colors. The original navy/ice primitives remain for branding. Functional status colors and user-selected project/calendar/label colors remain available. See [DESIGN.md](DESIGN.md) for visual guidance.

## Evidence on Hand

Routes, feature components, API integrations, and archived verification results provide evidence of current behavior. The repository README includes broader thesis ambitions and some older capability descriptions; resolve discrepancies against current implementation. Development and deployment instructions live in [local development](docs/development/local-setup.md) and [deployment](docs/deployment/production.md). Recording setup and operational limits are documented in the [LiveKit guide](backend/livekit/README.md).

## Product Principles

- Keep related work connected without losing its source or permission boundaries.
- Make today's next action easy to find and complete.
- Preserve context when opening details, editing tasks, or viewing conversations.
- Make loading, errors, and unavailable services understandable and recoverable.
- Distinguish implemented behavior from future product ambitions.

## Accessibility & Inclusion

Support keyboard navigation, accessible control names, visible focus, reduced motion, and readable contrast in both themes. Use labels and icons alongside status colors. Preserve responsive layouts and avoid hiding essential actions on small screens.
