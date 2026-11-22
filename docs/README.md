# WorkspaceHub documentation

Start with the guides below for local setup, deployment, feature behavior and verification. Thesis diagrams and interface samples are maintained under `thesis/`.

| Area | Guides |
| --- | --- |
| Architecture | [System architecture](architecture/system-architecture.md) |
| Development | [Local setup](development/local-setup.md), [environment](development/environment.md), [private storage](development/private-storage.md) |
| Deployment | [Production](deployment/production.md), [migrations](deployment/migrations.md), [security rollout](deployment/security-rollout.md) |
| Features | [Calendar reminders](features/calendar-reminders.md), [chat mentions](features/chat-mentions.md), [file copies and sharing](features/document-chat-sharing.md), [AI request lifecycle](features/ai-request-lifecycle.md), [conversation AI language](features/conversation-ai-language.md), [voice messages](features/voice-messages.md), [socket recovery](features/socket-session-recovery.md) |
| Frontend | [Design tokens](frontend/design-tokens.md), [SEO metadata](frontend/seo-metadata.md) |
| Verification | [Testing](../tests/README.md), [system verification](../tests/system/README.md) |
| Thesis | [Interface index](thesis/interfaces/index.html), [interface guide](thesis/interfaces/README.md), [diagram files](#thesis-diagrams) |

Account timezone behavior, UTC storage, all-day dates, searchable selection and the workspace clock are documented in [Timezones](features/timezones.md). The feature applies across modules without a timezone selector in every scheduling form.

## Thesis interface samples

Open [thesis/interfaces/index.html](thesis/interfaces/index.html) to choose from 20 English interface samples. The previews reuse application components with sample data, including the populated dashboard, project tasks and calendar examples. They use local API and realtime adapters for screenshots and do not save changes to the application database.

The Meeting Room preview follows the current application controls with live captions (CC) removed. Voice-message transcription and AI summaries of completed meeting recordings remain available as separate application features, subject to their configuration and permissions.

Keep the HTML files together with `thesis/interfaces/assets/` and `thesis/interfaces/source/`. The index uses `assets/styles.css`; the interface pages use `assets/system.css` and `assets/system-ui.js`. To rebuild the interface pages after changing application components, run from the repository root with frontend dependencies installed:

```powershell
node docs/thesis/interfaces/source/build.cjs
```

After rebuilding, reload the browser with Ctrl+F5. See the [interface guide](thesis/interfaces/README.md) for sample data and preview behavior.

## Thesis diagrams

| Diagram | Editable file |
| --- | --- |
| System architecture views | [architecture-diagram.drawio](thesis/diagrams/architecture/architecture-diagram.drawio) |
| Core business class diagrams | [class-diagram.drawio](thesis/diagrams/class/class-diagram.drawio) |
| Core business ERDs | [erd-diagram.drawio](thesis/diagrams/erd/erd-diagram.drawio) |
| Screen flows by actor | [screen-flow.drawio](thesis/diagrams/screen-flow/screen-flow.drawio) |

The Class Diagram and ERD files each contain seven service pages. They show the selected business models and their fields and relationships; operational support tables are omitted from these thesis views. Open the files in Draw.io to edit them or export images for Word.

## Component guides

- [Docker local infrastructure and AI](../backend/docker/README.md), [AI service](../backend/ai-service/README.md).
- [LiveKit and recording](../backend/livekit/README.md), [Kong](../backend/kong-gateway/README.md).
- [Project](../backend/project-service/README.md), [Communication](../backend/communication-service/README.md), [Calendar](../backend/calendar-service/README.md).
- [Deployment entrypoints](../deploy/README.md), [production AI](../deploy/ai/README.md).
- [Product context](../PRODUCT.md), [design direction](../DESIGN.md).

The environment reader inventory is [development/environment-contract.json](development/environment-contract.json). It is tooling input, not a place to store credentials.
