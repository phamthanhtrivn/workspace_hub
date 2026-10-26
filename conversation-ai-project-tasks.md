# Project tasks in conversation AI

Scope: a read-only LangChain tool answers requests about the current sender's
assigned tasks using Project Service, with identity bound by Communication Service.
No task creation/editing or querying another user's assignments is added.

- [x] Add an authenticated internal Project query: own assignments, owner/active-member access, bounded fields/results and Vietnam-day filters.
- [x] Bridge the tool through the claimed chat request; revalidate membership and never accept an LLM-selected user ID.
- [x] Add the LangChain tool, per-query caching and accurate empty/unavailable responses; retain history/clock/budget behavior.
- [x] Configure a dedicated inter-service key and start Project Service without changing existing data.
- [x] Test authorization, date boundaries, filtering and tool routing; verify normal and interrupted chat jobs still work.
- [x] Drain workers, deploy, run live task retrieval/reply checks, and document usage/limits.

Today includes assigned unfinished work due today/overdue or scheduled across the
Vietnam day. Overdue and all-open filters are also available. Linked project spaces
scope results to that project; other chats use the sender's accessible projects.
Tool results contain titles, status, priority, project names and dates, without
comments/descriptions/files. Replies appear in the conversation where requested.


Implemented on feature/conversation-ai-project-tasks. AI 107, Communication 92,
Project 29 tests passed (228 total). Live real-DB and real-model/socket checks
passed; fixtures removed. Added V21/Prisma index declaration and applied the
idempotent user-assignee lookup index locally. No existing task rows were changed.
Project and Communication run with IPv4 preference for local Docker Kafka.
AI API/worker were deployed after draining active jobs. Model/budget unchanged.
See backend/ai-service/CONVERSATION_AI.md for setup, filter semantics and limits.
