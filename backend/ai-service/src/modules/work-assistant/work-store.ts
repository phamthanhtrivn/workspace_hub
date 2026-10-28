import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { rows, transaction } from "../../infrastructure/database/database";
import { TooManyRequestsException } from "../../common/errors/rate-limit.exception";
import type { Actor } from "../../common/types";
import type { StoredMessage, TaskReference } from "./work-assistant.types";
import { conversationCursor, parseConversationCursor } from "./work-cursor";
export type WorkSession = {
  id: string;
  owner_id: string;
  project_id: string | null;
  scope_key: string;
  updated_at: string;
};
@Injectable()
export class WorkStore {
  async session(actor: Actor, projectId?: string, create = false) {
    return transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,8087006))",
        [actor.id],
      );
      if (!create) {
        const { rows: existing } = await client.query<WorkSession>(
          "SELECT * FROM notebook_ai.work_assistant_sessions WHERE owner_id=$1 AND " +
            (projectId ? "project_id=$2::uuid" : "project_id IS NULL") +
            " ORDER BY updated_at DESC,id DESC LIMIT 1",
          projectId ? [actor.id, projectId] : [actor.id],
        );
        if (existing[0]) return existing[0];
      }
      const sessionId = randomUUID();
      const {
        rows: [session],
      } = await client.query<WorkSession>(
        "INSERT INTO notebook_ai.work_assistant_sessions(id,owner_id,project_id,scope_key) VALUES($1,$2,$3,$4) RETURNING *",
        [sessionId, actor.id, projectId ?? null, sessionId],
      );
      return session;
    });
  }
  async list(actor: Actor, projectId?: string, before?: string) {
    const boundary = before ? parseConversationCursor(before) : undefined;
    if (boundary) {
      const [cursor] = await rows<{ updated_at: string }>(
        `SELECT to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') updated_at FROM notebook_ai.work_assistant_sessions WHERE id=$1 AND owner_id=$2 AND project_id IS NOT DISTINCT FROM $3::uuid`,
        [boundary.id, actor.id, projectId ?? null],
      );
      if (!cursor) throw new NotFoundException("Conversation cursor not found");
      boundary.updatedAt ??= cursor.updated_at;
    }
    const parameters = projectId ? [actor.id, projectId] : [actor.id];
    const cursorParameter = parameters.length + 1;
    if (boundary) parameters.push(boundary.updatedAt!, boundary.id);
    const sessions = await rows<{
      id: string;
      project_id: string | null;
      updated_at: string;
      content: string | null;
      project_ids: string[];
    }>(
      `SELECT s.id,s.project_id,to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') updated_at,m.content,coalesce(m.project_ids,'[]'::jsonb) project_ids FROM (SELECT id,project_id,updated_at FROM notebook_ai.work_assistant_sessions WHERE owner_id=$1 AND ` +
        (projectId ? "project_id=$2::uuid " : "project_id IS NULL ") +
        (boundary
          ? `AND (updated_at,id)<($${cursorParameter}::timestamptz,$${cursorParameter + 1}::uuid) `
          : "") +
        "ORDER BY updated_at DESC,id DESC LIMIT 31) s LEFT JOIN LATERAL (SELECT content,project_ids FROM notebook_ai.work_assistant_messages WHERE session_id=s.id AND role='user' ORDER BY created_at,id LIMIT 1) m ON true ORDER BY s.updated_at DESC,s.id DESC",
      parameters,
    );
    const page = sessions.slice(0, 30);
    return {
      sessions: page,
      nextCursor:
        sessions.length > 30
          ? conversationCursor(page.at(-1)!.id, page.at(-1)!.updated_at)
          : null,
    };
  }
  async owned(actor: Actor, id: string) {
    const [session] = await rows<WorkSession>(
      "SELECT * FROM notebook_ai.work_assistant_sessions WHERE id=$1 AND owner_id=$2",
      [id, actor.id],
    );
    if (!session) throw new NotFoundException();
    return session;
  }
  async history(session: WorkSession, before?: string) {
    if (before) {
      const [cursor] = await rows(
        "SELECT id FROM notebook_ai.work_assistant_messages WHERE id=$1 AND session_id=$2",
        [before, session.id],
      );
      if (!cursor) throw new NotFoundException("History cursor not found");
    }
    const messages = await rows<StoredMessage>(
      "SELECT * FROM notebook_ai.work_assistant_messages WHERE session_id=$1 " +
        (before
          ? "AND (created_at,id)<(SELECT created_at,id FROM notebook_ai.work_assistant_messages WHERE id=$2 AND session_id=$1) "
          : "") +
        "ORDER BY created_at DESC,id DESC LIMIT 31",
      before ? [session.id, before] : [session.id],
    );
    const page = messages.slice(0, 30).reverse();
    return {
      messages: page,
      nextCursor: messages.length > 30 ? page[0]?.id : null,
    };
  }
  async recent(session: WorkSession) {
    const messages = await rows<StoredMessage>(
      "SELECT * FROM notebook_ai.work_assistant_messages WHERE session_id=$1 ORDER BY created_at DESC,id DESC LIMIT 4",
      [session.id],
    );
    return messages.reverse();
  }
  async begin(actor: Actor, session: WorkSession, requestId: string) {
    await transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,8087006))",
        [actor.id],
      );
      const { rows: existing } = await client.query(
        "SELECT id FROM notebook_ai.work_assistant_requests WHERE id=$1",
        [requestId],
      );
      if (existing.length)
        throw new ConflictException(
          "Yêu cầu đã được xử lý. Hãy tải lại hội thoại.",
        );
      await client.query(
        "UPDATE notebook_ai.work_assistant_requests SET status='INTERRUPTED',updated_at=now() WHERE owner_id=$1 AND status='RUNNING' AND created_at<now()-interval '3 minutes'",
        [actor.id],
      );
      const {
        rows: [usage],
      } = await client.query(
        "SELECT count(*) FILTER(WHERE status='RUNNING')::int active,count(*) FILTER(WHERE created_at>now()-interval '1 minute')::int recent FROM notebook_ai.work_assistant_requests WHERE owner_id=$1 AND (status='RUNNING' OR created_at>now()-interval '1 minute')",
        [actor.id],
      );
      if (usage.active)
        throw new ConflictException("Một câu hỏi khác đang được xử lý.");
      if (usage.recent >= 8)
        throw new TooManyRequestsException(
          "Bạn hỏi quá nhanh. Vui lòng thử lại sau một phút.",
        );
      await client.query(
        "INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id) VALUES($1,$2,$3)",
        [requestId, session.id, actor.id],
      );
    });
  }
  async canceled(actor: Actor, id: string) {
    const [row] = await rows<{ cancel_requested: boolean; status: string }>(
      "SELECT cancel_requested,status FROM notebook_ai.work_assistant_requests WHERE id=$1 AND owner_id=$2",
      [id, actor.id],
    );
    return !row || row.cancel_requested || row.status !== "RUNNING";
  }
  async cancel(actor: Actor, id: string) {
    const result = await rows(
      "UPDATE notebook_ai.work_assistant_requests SET cancel_requested=true WHERE id=$1 AND owner_id=$2 RETURNING id",
      [id, actor.id],
    );
    if (!result.length) throw new NotFoundException();
  }
  async finish(
    actor: Actor,
    session: WorkSession,
    requestId: string,
    question: string,
    content: string,
    sources: TaskReference[],
    projectIds: string[],
    metadata: StoredMessage["context"],
  ) {
    return transaction(async (client) => {
      const { rows: changed } = await client.query(
        "UPDATE notebook_ai.work_assistant_requests SET status='COMPLETED',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING' AND NOT cancel_requested RETURNING id",
        [requestId, actor.id],
      );
      if (!changed.length) throw new ConflictException("Yêu cầu đã bị hủy.");
      const references = JSON.stringify(sources),
        ids = JSON.stringify(projectIds);
      await client.query(
        "INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,project_ids,created_at) VALUES($1,$2,$3,'user',$4,$5::jsonb,clock_timestamp())",
        [randomUUID(), session.id, requestId, question, ids],
      );
      const {
        rows: [message],
      } = await client.query<StoredMessage>(
        "INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,sources,project_ids,context,created_at) VALUES($1,$2,$3,'assistant',$4,$5::jsonb,$6::jsonb,$7::jsonb,clock_timestamp()) RETURNING *",
        [
          randomUUID(),
          session.id,
          requestId,
          content,
          references,
          ids,
          JSON.stringify(metadata),
        ],
      );
      await client.query(
        "UPDATE notebook_ai.work_assistant_sessions SET updated_at=clock_timestamp() WHERE id=$1 AND owner_id=$2",
        [session.id, actor.id],
      );
      return message;
    });
  }
  async fail(actor: Actor, id: string, canceled: boolean) {
    await rows(
      "UPDATE notebook_ai.work_assistant_requests SET status=$3,updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING' RETURNING id",
      [id, actor.id, canceled ? "CANCELED" : "FAILED"],
    );
  }
}
