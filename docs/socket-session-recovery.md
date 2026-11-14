# Socket session recovery

Notification, Communication (Chat), and Project use the same session error contract.
Deploy/restart all three backend services before releasing the frontend. No database
migration or new environment variable is required.

| Code | Client behavior |
| --- | --- |
| `TOKEN_EXPIRED` | Share a credential refresh with HTTP and reconnect using the latest token. |
| `TOKEN_INVALID` | Stop retrying this token; retain the application session for diagnosis. |
| `SESSION_REVOKED` | End the matching application session. |
| `AUTH_SERVICE_UNAVAILABLE` | Retry with exponential delay and jitter; retain credentials. |
| `AUTH_CONFIGURATION_ERROR` | Stop retrying this token; inspect service configuration. |

Handshake errors expose `data.code`. Connected sockets receive `session:error`
before the server disconnects them. Authorization remains required for handshakes,
incoming packets, and outgoing delivery. Backend logs include service, stage, and
code; they omit credentials. Internal endpoint 401/403 indicates a service credential
configuration problem, not a revoked browser session.

The client retries transient failures after 1, 2, 4, 8, 16, then at most 30 seconds,
with jitter, and pauses while offline. Legacy uncoded failures do not trigger logout.
After reconnect, existing feature listeners reconcile notification counts, chat
queries/active room, and project queries/subscriptions. Buffered writes are discarded
rather than replayed. Invalid/configuration errors require a new token or page reload
after the underlying problem is corrected.

Run the focused checks from the repository root after installing existing frontend
and backend dependencies:

```powershell
node tests/run-tests.mjs --project frontend/web --match session-recovery
node tests/run-tests.mjs --suite system --match socket
```

The tests use isolated HTTP/Socket.IO servers and test-only identities; they do not
access real account data. For a signed-in browser check, verify a normal connection,
token expiry/refresh, network recovery, and logout/revocation. Confirm that unread
counts and active chat/project data catch up after reconnect, with no duplicate
events. Never put real access tokens, cookies, or internal keys into diagnostic logs.
