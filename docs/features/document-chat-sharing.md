# File copies, sharing and client caching

## Destination-owned files

Message, meeting chat, Project and Notebook AI use the same file picker. It supports My files, Shared with me, folder navigation, name search, multiple selection, file-type icons and numbered pagination. Task attachments keep separate Upload, My Files and Project buttons. My Files offers only My files and Shared with me; Project opens a picker fixed to the current project, without source tabs. The Project Documents page remains available. Personal picker roots exclude project folders and include starred personal files.

**Send a copy** in Documents supports channels, direct conversations, live meeting chats the sender has joined, and writable projects. A project task is optional. File/folder access and destination permissions are checked on the server. A Viewer or Editor who can download a source can copy it; the source's sharing grants and public links are not propagated or modified. Account/link sharing inside Documents remains separate.

| Destination            | Stored result                                                | Limit                                                               |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Message / meeting chat | Ordinary uploaded attachment; folders become ZIP attachments | 10 MiB per attachment, including the finished ZIP                   |
| Project                | Independent Project Documents file; optional task attachment | Existing 10 MiB upload policy and copier's existing Documents quota |
| Notebook AI            | Private, independent source snapshot; no My files entry      | 5 sources, 20 MiB per file, 50 MiB per notebook                     |

Folders can only be sent as ZIPs to Message/Meeting. Project and Notebook allow browsing folders and selecting individual files. A ZIP must include every selected descendant: access, storage or size failures abort the export instead of returning a partial archive. Preparation also bounds input to 1,000 entries / 100 MiB and has a finite timeout.

Updating, trashing, deleting or revoking access to the original file does not change an accepted copy. Access then follows the destination module. Deleting a Project Documents copy can make task attachments to that destination unavailable; removing a task attachment does not delete its project file. Private Notebook source deletion removes its snapshot/index through the cleanup outbox.

Notebook copies and direct uploads do not consume the Documents account quota. Documents keeps its existing default 5 GiB per-account quota and 10 MiB file policy. Notebook does not currently impose a combined storage cap across all notebooks.

## Reliability and storage ownership

Document Service remains the S3 storage adapter. Private module snapshots have separate metadata and object keys, not DocumentItems, shares or links. AI owns source membership and lifecycle. Indexing, retrieval, citations and preview for new Notebook sources authorize the private snapshot rather than resolving the original document. Notebook uploads go directly to private snapshot storage and support the stated 20 MiB limit.

Copy operations persist their identity, pinned version, status and lease. Successful Message/Meeting imports reuse destination-owned media on retry. Project copies deduplicate by destination project + origin document/version; Notebook copies deduplicate within their notebook. Explicit new chat sends remain allowed.

Documents-to-chat sends the optional introduction and attachment as separate messages. Each has a durable request ID; confirmed introduction delivery is skipped on retry. Composer sends containing prepared copies also carry a request ID, including threads and Meeting. Message transactions reserve imported files against abandoned-copy cleanup. Permission is rechecked before replay; changing a receipt's payload conflicts. Deleted/recalled messages are never recreated. Existing post-commit socket publication remains unchanged; a crash after message commit may require a history refresh.

The browser persists only opaque IDs/progress in session storage using an account-scoped payload digest. It does not persist document bytes or introduction text. Without session storage, retries survive only while the page remains loaded. A completed explicit send clears its attempt. Expired preparations require a fresh copy attempt.

Temporary chat exports, unfinished uploads and failed snapshot operations expire after 24 hours. Communication records copy operations in DocumentAttachmentImport. MediaCopyCleanup is its durable S3 deletion queue for abandoned copies; these tables remain part of the application schema, while completed cleanup rows are removed. Cleanup rechecks actual media references. Published media is retained according to its destination lifecycle. Notebook deletion uses a durable outbox. READY Notebook snapshots are preserved conservatively if AI committed a source but its retention acknowledgement was interrupted; the maintenance command below reconciles unbound leftovers without risking committed sources.

## Cache behavior

The shared picker uses React Query with 30 seconds of freshness and five minutes of inactive retention. Keys include account, source scope, project/folder, page and search. Permission events reset the account's picker cache; actions still perform fresh backend authorization. Authentication cleanup clears account-specific cached state. Copy dialogs do not add socket listeners or start AI generation.

## Local rollout

A database reset is optional; use the explicit [fresh local state procedure](../development/local-setup.md#fresh-local-workspacehub-state) only when you want to erase all local application data. Stop the existing Document/Communication dev processes with Ctrl+C first; Windows may lock the Prisma engine DLL while they run. Use a migration-capable database identity for Prisma migrations. Keep runtime credentials intact.

From the repository root, prepare the changed host services:

```powershell
Push-Location backend/document-service
npx prisma migrate deploy
npx prisma generate
npm run build
Pop-Location

Push-Location backend/communication-service
npx prisma migrate deploy
npx prisma generate
npm run build
Pop-Location
```

Communication needs DOCUMENT_SERVICE_URL pointing to the host Document Service. The private local environment was updated without changing credentials. Docker AI continues using its existing Document URL and AI_DOCUMENT_SERVICE_KEY; no new secret is required. New private copies use documents/{actorId}/module-snapshots/{chat|notebook}/{snapshotId} inside the existing Documents storage namespace. They remain separate snapshot metadata, not DocumentItems or My files entries. This reuses the current storage policy without requiring a new top-level S3 permission. Completed copies at the legacy module-snapshots prefix remain readable from their saved keys; incomplete copies relocate atomically when their lease is claimed again. Older unfinished Notebook upload attempts return 410 so the client can prepare a fresh upload. Keep legacy read/delete access while such records exist.

Build AI, apply its additive migration, then recreate only its API/jobs:

```powershell
docker compose -f backend/docker/compose.yml build migrate notebook-api notebook-jobs
docker compose -f backend/docker/compose.yml run --rm migrate
docker compose -f backend/docker/compose.yml up -d --no-deps notebook-api notebook-jobs
docker compose -f backend/docker/compose.yml logs -f --tail=100 notebook-api notebook-jobs
```

Run each host command in its own terminal:

```powershell
# Terminal 1
cd backend/document-service
npm run start:dev

# Terminal 2
cd backend/communication-service
npm run start:dev

# Terminal 3
cd frontend/web
npm run dev
```

The unchanged Project Service and other business services can keep running. If all infrastructure was previously stopped, use the combined Compose entrypoint before starting host services. Reload an existing web dev server after backend rollout; a production web build is not required for local testing.

## Remove legacy references on local databases

Skip this scoped command if you chose the full local data reset above.

New sends create independent attachments instead of DOCUMENT cards. The old chat-access grant endpoint and its unused UI pipeline have been removed. Legacy readers remain compatible until cleanup is explicitly run.

Apply all three schema migrations before using the following command from the repository root. It reads private host env files and refuses non-local database URLs. Inspection is the default; neither service startup nor a dry run deletes data.

```powershell
node backend/scripts/purge-legacy-file-references.mjs --dry-run
node backend/scripts/purge-legacy-file-references.mjs --apply
```

Stop Communication and AI API/jobs before applying cleanup, then restart them after it completes. Each database is changed in its own transaction; if a later domain fails, inspect the report and run the command again. A repeated run is safe.

Cleanup removes old DOCUMENT cards in channel/direct chat and Notebook sources whose snapshot_id is NULL. Original Documents, ordinary messages, meeting messages, accounts, projects, calendars, recordings, private copied sources, notebooks and notes are retained. A legacy card with ordinary thread replies becomes an empty recalled placeholder so those replies survive. Its document payload/media reference is removed. Message delivery receipts remain to prevent an old retry from restoring a removed card.

Notebook index deletion is queued through the existing cleanup outbox. Content that cites a removed source continues to follow the existing inaccessible-source policy. This is a scoped local cleanup, not a full database reset; no original file object is deleted.

### Private snapshot maintenance

Inspect expired private copies independently:

```powershell
node backend/scripts/reconcile-notebook-snapshots.mjs --dry-run
```

To prune reported unbound snapshots, stop AI API/jobs yourself before passing --offline. This avoids racing source attachment. Bound sources remain intact and interrupted retention acknowledgements are repaired. Unbound private objects are queued for the existing storage cleanup worker.

```powershell
node backend/scripts/reconcile-notebook-snapshots.mjs --apply --offline
docker compose -f backend/docker/compose.yml up -d --no-deps notebook-api notebook-jobs
```

## Verification

Regression tests cover destination authorization, operation replay, concurrency claims, independent Notebook snapshots, ZIP integrity/limits, shared pickers and scoped legacy cleanup. Migration SQL is checked on isolated sample schemas inside ROLLBACK transactions. Runtime S3 transfer, IAM permissions, live meetings and Docker rollout still require local acceptance testing; mocks do not establish those results.
