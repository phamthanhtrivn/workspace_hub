# System architecture

WorkspaceHub consists of a Next.js web client, Kong and independently owned business services. During local development, the web and business applications run on the host; infrastructure and all AI processes run in one modular Compose project. Production uses APP, INFRA and REALTIME hosts, with AI separately operated on APP.

| Component | Responsibility | Source |
| --- | --- | --- |
| Web | Product UI; React Query for server state, Redux for existing global state, and real-time badge sync over existing `/communication.io` & `/notification.io` singletons | frontend/web |
| Kong | Routing, verified identity context, public/internal boundary and request policies | backend/kong-gateway |
| User | Accounts, OTP, credentials, refresh/reset tokens, sessions and profiles | backend/user-service |
| Project | Projects, membership, tasks, checklists, comments, labels and access synchronization | backend/project-service |
| Communication | Spaces, channels, direct messages, threads, polls, notes, meetings and sockets | backend/communication-service |
| Document | Files/folders, versions, sharing, quota, upload intents and storage lifecycle | backend/document-service |
| Calendar | Events, recurrence, attendees, reminders, conference bindings and Pomodoro | backend/calendar-service |
| Notification | PostgreSQL notification state, Kafka consumers and delivery | backend/notification-service |
| AI API/jobs | Notebooks, sources, cited SSE Q&A, summaries, conversation/work assistance and media jobs | backend/ai-service/api |
| RAG | Parsing/OCR, chunking, embeddings and scoped retrieval | backend/ai-service/rag-worker |
| Speech | CPU speech recognition for meeting and voice workflows | backend/ai-service/speech-worker |

## Data and integration

PostgreSQL databases are owned by service. User uses JPA, business NestJS services use Prisma, and AI uses pg/SQL migrations. Cross-service operations use APIs/events rather than direct access to another service's tables. The local shared PostgreSQL credential does not enforce per-database privilege isolation.

Kafka transports business events. Transactional outboxes record delivery intent with the business change and support retry/idempotency. Redis supports session/OTP state, realtime adapters and BullMQ. AI uses notebook_db/schema notebook_ai, queues/checkpoints and the wh-notebook key prefix on the shared Redis instance; separate namespaces do not isolate RAM or persistence.

Document owns S3 file metadata and revisions. Current general uploads/attachments have a 10 MiB cap; notebook preflight has its own bounds. Validate each workflow rather than applying one cap to every endpoint. Chat media access depends on its owning conversation. LiveKit handles media while Communication authorizes participation, controls recording and processes webhooks. Egress writes recording output using the existing storage integration.

Local Docker preserves wh_network and existing data volume names. AI workers use an internal network; only API/jobs/migration join the shared network. Production AI joins the APP network and uses INFRA database/Redis endpoints.

## Authorization boundaries

Kong verifies public requests and removes spoofed identity headers. Services validate identity, sessions and resource access at HTTP/socket boundaries. Reset tokens are not access tokens, and socket rooms require current membership. Public channels remain restricted to space members.

Internal caller credentials are scoped by direction and receiver route. A caller key proves the service, not the user's right to a resource. AI rechecks notebook/source and Document/Communication access at relevant processing and read boundaries. Provider and internal credentials never go to the browser.

Refresh tokens rotate with family revocation/reuse detection. Password reset is single-use and password changes revoke sessions. Frontend refresh coordination avoids parallel rotation races across tabs. Revocation cannot recover bytes already read or downloaded legitimately.

## Code organization and transactions

Controllers remain transport facades; internal providers split access, query, validation, mutation, presentation and publishing responsibilities. Services build independently without a new shared application package.

- Document separates access, tree/location, upload/version, sharing, lifecycle and streaming. Quota, tree locks and upload intent changes remain transactional.
- Communication separates space membership/provisioning, channel/thread synchronization, message/DM operations and socket publishing. SocketPublishingModule contains emitters/room publishers without importing MessageModule or gateways.
- Project separates task lookup/query/validation/mutation/attachments/activity and project chat/document workflows. Outboxes and access-sync intents commit with business changes. ProjectAccessModule and TaskPolicyModule avoid importing full feature modules into policy consumers.
- Calendar separates recurrence creation and THIS/THIS_AND_FOLLOWING/ALL mutation paths, occurrence helpers and transaction coordination. Pomodoro has config/timer/session/statistics responsibilities.
- User keeps the Spring transaction proxy at AuthService, with registration/login/refresh/token and response helpers behind it. Preserve user-before-token lock ordering and the existing BusinessException rollback policy.
- AI separates access/admission, query, generation, workflows and SSE transport. Database/queue/model adapters wrap the existing instances; entrypoints retain shutdown, checkpoint and recovery ownership.

Atomic helpers receive the existing Prisma transaction client; collaborators do not open independent transactions around part of a workflow. InvitationDeliveryModule and socket publishing modules prevent reverse imports into the business modules they serve.

## AI processing

Notebook sources reference authorized Document revisions. Workers fetch the bytes, parse/index through RAG, and retrieve only inside the verified notebook/source scope. Q&A streams citations; summaries save checkpoints. Removing a notebook does not delete the original Document file.

Conversation context stays within the permitted conversation/thread. Meeting summaries are owner-triggered after completion and shared through recording access. Speech recognition runs locally; transcripts and excerpts used for generation go to the configured model provider. Feature flags and provider/embedding settings are environment configuration, not proof of quality or readiness for every input.

See [local setup](../development/local-setup.md), [AI service](../../backend/ai-service/README.md), [migrations](../deployment/migrations.md) and [production](../deployment/production.md).
