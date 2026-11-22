# WorkspaceHub — Intelligent All-in-One Management Platform

WorkspaceHub brings project tasks, personal planning, communication, documents, meetings and focused work into one web workspace, with AI features connected to existing resource permissions.

## Overview and Abstract

Fragmented tools make it difficult for individuals and small teams to keep work and its supporting information together. This graduation thesis implements a platform that connects task management, calendars, real-time conversations, document storage, meetings and Pomodoro sessions. AI provides cited document Q&A and summaries, conversation assistance, work assistance, meeting summaries and voice transcription. Access checks remain owned by the business services; AI does not grant access to otherwise private resources.

| Thesis detail | Description |
| --- | --- |
| Topic | Building an intelligent work support and management platform |
| Intended users | Students, individuals and small teams collaborating on study or work |
| Inputs | Accounts, project tasks, calendars, documents, messages, meeting recordings and focus sessions |
| Outputs | Permission-aware web workflows, notifications, progress information and configured AI assistance |
| Current delivery | Web application and backend microservices; provider-dependent features require configuration |

### Current features

| Area | Implemented capabilities |
| --- | --- |
| Accounts | Registration/email verification, sign-in, sessions, password recovery, profiles, avatars and preferences, including a searchable timezone selector and workspace clock |
| Projects and tasks | Membership/roles, board/list/calendar/Gantt views, assignments, priorities, labels, checklists, comments and related documents/chat |
| Calendar | Events and tasks, recurring occurrences, attendees, conference links, shared appearance controls and custom reminders |
| Notifications | Categorized bell, real-time updates, foreground toast/sound, Web Push and email where configured; reminder delivery deduplication |
| Communication | Spaces/channels, direct messages, threads, reactions, attachments, polls, notes, voice recording/playback and transcription |
| Documents | Files/folders, versions, previews, sharing, public links, trash/archive workflows and controlled downloads |
| Meetings | Scheduling, admission, devices, video/audio, screen sharing, meeting chat/reactions, hand raising, recordings, sharing and owner-triggered AI summaries |
| Productivity | Dashboard, Pomodoro focus/break sessions, task association, history/statistics and ambient audio |
| AI | Personal notebooks with independent source copies, cited Q&A and saved notes, conversation bot and attachment summaries, Project/Calendar Work Assistant, meeting summaries and speech transcription |

AI flags, model capability, provider quota and dependent services determine availability. Meeting summaries are explicitly requested after a recording completes; readers with current recording access share the saved result. Flashcards, quizzes and a mobile application are not claimed as implemented features.

The [thesis interface samples](docs/thesis/interfaces/README.md) include an English Meeting Room preview with sample participants and the current room controls. These samples are for screenshots; they do not connect to a live meeting or run AI processing.

Dates and times across the workspace use the user's saved timezone (Vietnam UTC+07:00 by default), while timestamp storage remains UTC. Settings contains one timezone selector; timed forms use that preference and all-day dates retain their calendar day. See [timezone behavior](docs/features/timezones.md).

Workspace navigation uses a full-height sidebar with module descriptions and account Settings at the bottom. The header contains breadcrumbs, desktop navigation collapse/expand, Help, notifications with an unread indicator, and the user menu. The original header/sidebar outer borders, saved collapse preferences and mobile navigation remain supported; see [UI guidance](DESIGN.md).

The connected four-node blue brand mark is a transparent SVG shared by the workspace, landing/footer, authentication, public sharing and social preview. Browser and notification icons are derived from that source; regenerate them with `npm run generate:brand-icons` in `frontend/web`. The header clock uses 12-hour time with AM/PM and the saved account timezone.

Landing interface previews share the workspace's logo and navigation metadata, and mirror its current header/sidebar presentation, including AM/PM and UTC offset. Their clock and content remain fixed sample data. Keep the corresponding landing copy and previews in sync whenever a visible workspace feature changes.

## System Architecture and Technology Stack

~~~mermaid
flowchart TD
    Web[Next.js Web] --> Kong[Kong Gateway]
    Kong --> Business[User / Project / Communication / Document / Calendar / Notification]
    Kong --> AI[AI API]
    Business --> Postgres[(PostgreSQL)]
    Business --> Redis[(Redis)]
    Business <--> Kafka[Kafka]
    Business --> S3[S3 Storage]
    Business --> LiveKit[LiveKit and Egress]
    AI --> Postgres
    AI --> Redis
    AI --> Jobs[AI Jobs]
    Jobs --> RAG[RAG Worker and Qdrant]
    Jobs --> Speech[Local Speech Worker]
    AI --> Model[Configured AI Provider]
    Jobs --> Model
~~~

| Layer | Technology and responsibility |
| --- | --- |
| Web | Next.js App Router, React, TypeScript, Tailwind, React Query, Redux, FullCalendar and LiveKit client |
| User | Java 21, Spring Boot, Spring Security/JPA; authentication and accounts |
| Business services | NestJS/TypeScript with Prisma/PostgreSQL; independent domain ownership |
| AI API/jobs | NestJS, PostgreSQL SQL migrations, BullMQ and configurable model integrations |
| AI workers | Python document parsing/OCR/retrieval and faster-whisper speech recognition |
| Infrastructure | Kong, PostgreSQL, Redis, Kafka, LiveKit/Egress, S3 and Qdrant |
| Operations | Docker Compose locally; image-based CI and EC2 production deployment |

Kong validates public requests and forwards trusted context. Services enforce session and resource permissions; internal APIs use dedicated caller credentials. Socket subscriptions and asynchronous work also recheck access. See [architecture](docs/architecture/system-architecture.md).

## Database Schemas and Storage Design

- Each business service owns its PostgreSQL database. User uses JPA, the NestJS business services use Prisma, and AI uses SQL migrations for notebook/job/checkpoint data.
- User records include accounts, profiles, preferences and session/token state. Project records include projects, membership, tasks, assignments, labels, checklists, comments and delivery intents.
- Communication owns conversations, messages, attachments, meeting participation, recordings and recording access. Calendar owns event/series/occurrence, attendee, reminder and Pomodoro data.
- Document owns file/folder metadata, versions, sharing and storage lifecycle. Notification stores notifications and delivery receipts in PostgreSQL, not MongoDB.
- Redis supports sessions, realtime coordination and AI queues. Kafka carries business events. S3 stores private files/media; Qdrant stores retrieval indexes. Notebook AI uses private source snapshots; legacy linked sources retain their original permission checks.

Database ownership does not imply separate local database credentials: the existing local setup shares a PostgreSQL login. See [environment](docs/development/environment.md), [storage](docs/development/private-storage.md) and [migrations](docs/deployment/migrations.md).

## Project Structure

~~~text
workspace_hub/
├── backend/
│   ├── docker/                 # Combined local Compose and component env files
│   │   ├── infra/
│   │   ├── gateway/
│   │   ├── realtime/
│   │   └── ai/
│   ├── user-service/           # Java accounts and authentication
│   ├── project-service/        # Projects and tasks
│   ├── communication-service/  # Chat and meetings
│   ├── document-service/       # Documents and sharing
│   ├── calendar-service/       # Calendar and focus workflows
│   ├── notification-service/   # Notifications and delivery
│   ├── ai-service/             # API/jobs, RAG and speech source
│   ├── kong-gateway/           # Gateway image, templates and plugins
│   ├── livekit/                # Media configuration
│   └── scripts/                # Local configuration and maintenance tooling
├── frontend/web/               # Next.js web application
├── docs/                       # Architecture, development, deployment and features
├── tests/                      # Shared test tooling and system verification
└── deploy/                     # Production configuration and deployment tools
~~~

## How to Run the Project

Use Docker Desktop/Compose with include support (2.20+), Node.js 22, npm, Java 21 and Maven. Run the following from the repository root. Keep private env files outside Git.

### 1. Configure environments

Business services and web use their existing host env files. Docker groups each use their own private env under backend/docker. Existing credentials must match their callers/receivers; do not overwrite a working private env with sample values.

~~~powershell
node backend/scripts/prepare-local-docker-env.mjs
# Apply after reviewing the dry-run file list.
node backend/scripts/prepare-local-docker-env.mjs --write
node backend/scripts/validate-local-docker-env.mjs
~~~

See [environment setup](docs/development/environment.md) for new-machine requirements and [Docker migration](backend/docker/README.md#transition-from-the-previous-ai-stack) before replacing the previous AI containers.

### 2. Start infrastructure and AI

~~~powershell
docker compose -f backend/docker/compose.yml config --quiet
docker compose -f backend/docker/compose.yml up -d --build
docker compose -f backend/docker/compose.yml ps -a
~~~

This starts infrastructure, Kong, LiveKit/Egress and all AI processes. It does not start web or the six business-service applications. AI migration runs automatically; review and apply the business-service SQL/Prisma migrations as described in [local setup](docs/development/local-setup.md).

### 3. Start host applications

Run each in a separate terminal after installing dependencies and preparing its schema:

| Directory | Start command |
| --- | --- |
| backend/user-service | mvn spring-boot:run |
| backend/project-service | npm run start:dev |
| backend/communication-service | npm run start:dev |
| backend/notification-service | npm run start:dev |
| backend/document-service | npm run start:dev |
| backend/calendar-service | npm run start:dev |
| frontend/web | npm run dev |

User Service needs env values supplied through its JVM/IDE or terminal configuration. Stop a host AI process on port 8087 before running Docker AI. Open http://localhost:3000 and check service readiness; a healthy Kong alone does not mean all host services are ready.

### 4. Inspect and stop Docker

~~~powershell
docker compose -f backend/docker/compose.yml logs -f notebook-api notebook-jobs livekit-egress
docker compose -f backend/docker/compose.yml stop
~~~

Keep existing volumes and allow AI jobs time to checkpoint. Details and group-specific commands are in [Docker local](backend/docker/README.md).

## Testing and Deployment

~~~powershell
node tests/run-tests.mjs --all
node tests/run-tests.mjs --suite system
node --test tests/support/discovery.spec.mjs backend/scripts/local-security/env-files.test.mjs backend/scripts/local-docker-env.test.mjs
mvn -B -f backend/user-service/pom.xml test
~~~

Run test typechecking/builds from the changed application. Docker/database integration is opt-in and uses its own isolation requirements. Fast tests use provider doubles and do not certify SMTP, model output quality or real recording. See [testing](tests/README.md).

Production uses separate APP, INFRA and REALTIME configurations; AI has its own production stack. See [deployment](deploy/README.md). A full Docker local application stack is deferred. Browse the [documentation index](docs/README.md) for feature and operational guides.
