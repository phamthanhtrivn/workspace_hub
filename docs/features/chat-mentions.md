# Chat group mentions

In Space channels, the group mention depends on `Channel.isDefault`, regardless
of the channel's display name:

| Channel | Suggested group | Recipients |
| --- | --- | --- |
| Default channel (initially General) | `@All` | Accepted Space members, excluding the sender |
| Other public or private channels | `@Channel` | Current members of that channel who still belong to the Space, excluding the sender |

Channel threads inherit the same scope, including members who do not follow that
thread. Direct conversations and their threads keep their individual/bot mention
suggestions.

Typing or pasting `@All` in another channel is converted to `@Channel` when the
message is sent. A manually typed `@Channel` in the default channel is likewise
saved as `@All`. Names are case-insensitive and require token boundaries. Code,
Markdown block quotes, email addresses, and longer names such as `@Allison` do
not activate a group mention.

The Communication service resolves membership and canonicalizes the text inside
the message transaction, before AI registration and persistence. Published
mention recipients are server-resolved user IDs. Repeated group/individual
mentions are deduplicated; client group IDs alone do not activate a mention.
Existing new-message socket events carry these IDs to update mention badges.
Stored message history and existing permissions remain unchanged.

Run the focused checks from the repository root:

```powershell
node tests/run-tests.mjs --project backend/communication-service --match mention
node tests/run-tests.mjs --project frontend/web --match mention
```
