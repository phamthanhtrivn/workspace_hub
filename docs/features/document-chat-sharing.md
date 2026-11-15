# Document sharing and client caching

## Share a document into chat

Sharing sends a live document reference and grants the current recipients access. The optional introduction remains a separate text message. Attaching a file through **My Files** instead copies the file into chat storage; it does not use this sharing operation.

Every share attempt rechecks document access, conversation membership, send permissions and the current recipients. If access was granted but sending fails, the grants remain in place and **Try again** resumes the attempt.

Each message step carries its own `clientRequestId`. Communication stores a receipt atomically with the message, after checking permission. Concurrent requests and retries after a lost response reuse the existing message without registering AI work, changing thread counters or publishing another creation event. Changing the payload while reusing an ID returns a conflict. Receipts survive message deletion, so replay cannot recreate a deleted or recalled message.

The browser keeps opaque request IDs and confirmed progress in session storage, with an in-memory fallback. Keys include the account and a digest of the document, destination and introduction. Document contents and introduction text are not persisted. Retries with the same inputs reuse those IDs, including after a reload in the same browser tab. A confirmed successful share clears the attempt; changing the inputs starts a different attempt. Without session storage, retry continuity lasts only until the page reloads.

Message publication continues to use the existing post-commit socket/notification path. A process failure between the database commit and publication can require a history refresh; receipts prevent inserting or publishing a second message on replay, rather than introducing a new transactional event outbox.

## React Query

Documents Explorer and the chat My Files picker use the same infinite-query options for equivalent list requests: 30 seconds of freshness and five minutes of inactive retention. Keys isolate accounts, folders, projects, views, sorting and searches. My Files supports loading subsequent pages.

The global Chat socket owns Channel settings updates. Share dialogs do not register another settings listener. Sharing invalidates the specific document metadata, sharing details and cached lists containing the document. Permission notifications clear the current account's cached lists and the affected document's permission and preview queries. Reconnect reconciliation and fresh permission checks on file actions remain enabled. Account changes clear React Query through the existing authentication lifecycle.

## Local rollout

Apply the additive Communication migration before using the updated web client:

```powershell
cd backend/communication-service
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Stop an existing Communication dev process with `Ctrl+C` before starting it again. Start the web client with `npm run dev` from `frontend/web`, or reload it if the existing dev server has already picked up the changes. No new environment variables or Docker rebuild are required.
