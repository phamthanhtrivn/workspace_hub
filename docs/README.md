# WorkspaceHub documentation

The maintained guides describe the current repository. Completed implementation plans and dated audit reports have been removed; reusable checks remain in the testing guides.

| Area | Guides |
| --- | --- |
| Architecture | [System architecture](architecture/system-architecture.md) |
| Development | [Local setup](development/local-setup.md), [environment](development/environment.md), [private storage](development/private-storage.md) |
| Deployment | [Production](deployment/production.md), [migrations](deployment/migrations.md), [security rollout](deployment/security-rollout.md) |
| Features | [Calendar reminders](features/calendar-reminders.md), [chat mentions](features/chat-mentions.md), [AI request lifecycle](features/ai-request-lifecycle.md), [conversation AI language](features/conversation-ai-language.md), [voice messages](features/voice-messages.md), [socket recovery](features/socket-session-recovery.md) |
| Frontend | [Design tokens](frontend/design-tokens.md), [SEO metadata](frontend/seo-metadata.md) |
| Verification | [Testing](../tests/README.md), [system verification](../tests/system/README.md) |

## Component guides

- [Docker local infrastructure and AI](../backend/docker/README.md), [AI service](../backend/ai-service/README.md).
- [LiveKit and recording](../backend/livekit/README.md), [Kong](../backend/kong-gateway/README.md).
- [Project](../backend/project-service/README.md), [Communication](../backend/communication-service/README.md), [Calendar](../backend/calendar-service/README.md).
- [Deployment entrypoints](../deploy/README.md), [production AI](../deploy/ai/README.md).
- [Product context](../PRODUCT.md), [design direction](../DESIGN.md).

The environment reader inventory is development/environment-contract.json. It is tooling input, not a place to store credentials.
