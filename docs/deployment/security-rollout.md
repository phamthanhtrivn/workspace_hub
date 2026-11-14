# Security rollout and verification

Release matching User, Project, Communication, Document, Calendar, Notification, AI, Kong and web versions. Legacy access tokens without the required session or verified-email claims are not accepted. Never mark old accounts verified merely to bypass migration.

## Preparation

1. Apply all committed User SQL migrations, including the session authorization index, using the migration runner. Preserve existing data and migration history. For a prepared local database:

~~~powershell
docker cp deploy/shared/sql-migrations/migrate.sh wh_postgres:/tmp/workspacehub-migrate.sh
docker cp backend/user-service/src/main/resources/db/migration/. wh_postgres:/migrations
docker exec -e PGUSER=postgres -e PGDATABASE=user_db wh_postgres sh /tmp/workspacehub-migrate.sh
~~~

2. Validate the 16 directional caller credentials in backend/scripts/local-security/contract.mjs. Local database credentials are shared; this does not provide database privilege isolation. Production has a separate rollout contract. Never put service/signing keys in NEXT_PUBLIC variables.
3. Project, Communication and Notification need the shared Redis connection for realtime coordination/revocation. Chat and Document need Project access endpoints. Do not rotate existing keys as a setup shortcut.
4. Configure WEB_PUSH_ALLOWED_HOSTS with exact public push-provider hostnames, without wildcards, IPs or internal names. Missing configuration disables device delivery while bell notifications remain available. DNS/IP validation and connection pinning remain enforced; the VAPID private key stays on the backend.
5. TRUSTED_PROXY_CIDRS must identify real trusted proxies before forwarded addresses are used. User Service requires the actual frontend origin in FRONTEND_URL for browser refresh/logout; supply it to the JVM, not just a file Java does not load.
6. Avatar staging/confirmation accepts JPEG/PNG/WebP within 2 MiB and 4096 by 4096 limits. Keep private staging/final prefixes and the required object read/write/copy/delete permissions. See [storage](../development/private-storage.md).
7. Keep private Document prefixes inaccessible through public S3/CDN routes. Browser content is streamed through authorized backend access, without a presigned redirect.
8. Rebuild/recreate Kong for image/template changes and restart affected applications after intentional configuration/migration changes. Confirm mail/OTP configuration before testing authentication.

## Contracts and trust boundaries

- Verification send/confirm endpoints use purpose-specific, expiring OTPs with send/attempt limits and generic send feedback.
- Access JWTs require the expected purpose, expiry, verified email and sid/session family. Session dependency failure must not bypass authorization.
- Internal session/project authorization endpoints are not exposed through Kong. Caller credentials do not replace the actor's resource permission.
- Avatar confirmation requires the owner's upload intent and verified bytes. Public profile responses exclude private phone/date-of-birth/password-state fields.
- Document preview/download uses scoped, short-lived backend tickets tied to current session/permission/link generation. Guest/viewer/public-link access cannot edit, upload versions or read version history; named authorized editors/owners retain those operations.
- Kafka readiness tracks failures per topic/partition. Another partition's success cannot clear a failure. Durable quarantine handles invalid events; assignment changes affect readiness until rejoin.
- RAG authenticates before decoding payloads. Speech rejects missing/weak credentials. Browser download/open URLs accept validated private references or HTTP(S) URLs without embedded credentials.

## Verification

The [system suite](../../tests/system/README.md) uses isolated infrastructure, test identities and provider doubles. It does not certify every route or production environment. Run focused checks and the browser scenarios below after deployment:

- Register, verify OTP and sign in; reject invalid/expired/reused OTP and unverified access/refresh.
- Use two browser profiles. Changing IDs or headers must not expose another user's private resources.
- Exercise project membership/invitations and linked Calendar/Chat/Document access, including delayed synchronization and revoked membership.
- Open task details, document pickers and threads for at least a minute; avoid repeated fetch loops/429 responses and verify cross-tab updates.
- Kick/leave a chat member while multiple tabs are connected; no new room data should arrive.
- Revoke one session and test HTTP/socket denial without revoking an unrelated session. Check password reset/change behavior.
- Revoke document access and confirm Starred/shared/search metadata and new content requests obey it. Disable/re-enable a public link and reject older-generation GET/HEAD/Range tickets. ZIP exports exclude archived content.
- Reject malformed/oversized/spoofed avatar uploads and another user's upload intent.
- Reject invalid push keys, unsupported hosts, private destinations and non-443 endpoints without blocking bell delivery.
- Change accounts and verify private profile fields and caches do not leak between them.
- Inspect diagnostic logs for operation/request IDs without tokens, cookies, service keys, signed URLs or raw provider exception bodies.

## Operational limits

Previously issued S3 URLs can remain usable until their original TTL expires. Revocation cannot recover downloaded content. Legacy logs/credentials need a separate operational response; source changes do not delete logs, rotate keys or deploy production.

Kong's sanitized JSON logging retains request IDs/status/latency while omitting headers/query data. Raw proxy access/error logs are disabled because request URIs can contain content tickets. Inspect application/startup logs through their owning processes. See [environment](../development/environment.md), [migrations](migrations.md) and [production](production.md).
