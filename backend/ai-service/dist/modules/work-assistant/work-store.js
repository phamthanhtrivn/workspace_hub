"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkStore = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_1 = require("../../infrastructure/database/database");
const rate_limit_exception_1 = require("../../common/errors/rate-limit.exception");
const work_cursor_1 = require("./work-cursor");
let WorkStore = class WorkStore {
    async session(actor, projectId, create = false) {
        return (0, database_1.transaction)(async (client) => {
            await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,8087006))", [actor.id]);
            if (!create) {
                const { rows: existing } = await client.query("SELECT * FROM notebook_ai.work_assistant_sessions WHERE owner_id=$1 AND " +
                    (projectId ? "project_id=$2::uuid" : "project_id IS NULL") +
                    " ORDER BY updated_at DESC,id DESC LIMIT 1", projectId ? [actor.id, projectId] : [actor.id]);
                if (existing[0])
                    return existing[0];
            }
            const sessionId = (0, node_crypto_1.randomUUID)();
            const { rows: [session], } = await client.query("INSERT INTO notebook_ai.work_assistant_sessions(id,owner_id,project_id,scope_key) VALUES($1,$2,$3,$4) RETURNING *", [sessionId, actor.id, projectId ?? null, sessionId]);
            return session;
        });
    }
    async list(actor, projectId, before) {
        const boundary = before ? (0, work_cursor_1.parseConversationCursor)(before) : undefined;
        if (boundary) {
            const [cursor] = await (0, database_1.rows)(`SELECT to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') updated_at FROM notebook_ai.work_assistant_sessions WHERE id=$1 AND owner_id=$2 AND project_id IS NOT DISTINCT FROM $3::uuid`, [boundary.id, actor.id, projectId ?? null]);
            if (!cursor)
                throw new common_1.NotFoundException("Conversation cursor not found");
            boundary.updatedAt ??= cursor.updated_at;
        }
        const parameters = projectId ? [actor.id, projectId] : [actor.id];
        const cursorParameter = parameters.length + 1;
        if (boundary)
            parameters.push(boundary.updatedAt, boundary.id);
        const sessions = await (0, database_1.rows)(`SELECT s.id,s.project_id,to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') updated_at,m.content,coalesce(m.project_ids,'[]'::jsonb) project_ids FROM (SELECT id,project_id,updated_at FROM notebook_ai.work_assistant_sessions WHERE owner_id=$1 AND ` +
            (projectId ? "project_id=$2::uuid " : "project_id IS NULL ") +
            (boundary
                ? `AND (updated_at,id)<($${cursorParameter}::timestamptz,$${cursorParameter + 1}::uuid) `
                : "") +
            "ORDER BY updated_at DESC,id DESC LIMIT 31) s LEFT JOIN LATERAL (SELECT content,project_ids FROM notebook_ai.work_assistant_messages WHERE session_id=s.id AND role='user' ORDER BY created_at,id LIMIT 1) m ON true ORDER BY s.updated_at DESC,s.id DESC", parameters);
        const page = sessions.slice(0, 30);
        return {
            sessions: page,
            nextCursor: sessions.length > 30
                ? (0, work_cursor_1.conversationCursor)(page.at(-1).id, page.at(-1).updated_at)
                : null,
        };
    }
    async owned(actor, id) {
        const [session] = await (0, database_1.rows)("SELECT * FROM notebook_ai.work_assistant_sessions WHERE id=$1 AND owner_id=$2", [id, actor.id]);
        if (!session)
            throw new common_1.NotFoundException();
        return session;
    }
    async history(session, before) {
        if (before) {
            const [cursor] = await (0, database_1.rows)("SELECT id FROM notebook_ai.work_assistant_messages WHERE id=$1 AND session_id=$2", [before, session.id]);
            if (!cursor)
                throw new common_1.NotFoundException("History cursor not found");
        }
        const messages = await (0, database_1.rows)("SELECT * FROM notebook_ai.work_assistant_messages WHERE session_id=$1 " +
            (before
                ? "AND (created_at,id)<(SELECT created_at,id FROM notebook_ai.work_assistant_messages WHERE id=$2 AND session_id=$1) "
                : "") +
            "ORDER BY created_at DESC,id DESC LIMIT 31", before ? [session.id, before] : [session.id]);
        const page = messages.slice(0, 30).reverse();
        return {
            messages: page,
            nextCursor: messages.length > 30 ? page[0]?.id : null,
        };
    }
    async recent(session) {
        const messages = await (0, database_1.rows)("SELECT * FROM notebook_ai.work_assistant_messages WHERE session_id=$1 ORDER BY created_at DESC,id DESC LIMIT 4", [session.id]);
        return messages.reverse();
    }
    async begin(actor, session, requestId) {
        await (0, database_1.transaction)(async (client) => {
            await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,8087006))", [actor.id]);
            const { rows: existing } = await client.query("SELECT id FROM notebook_ai.work_assistant_requests WHERE id=$1", [requestId]);
            if (existing.length)
                throw new common_1.ConflictException("Yêu cầu đã được xử lý. Hãy tải lại hội thoại.");
            await client.query("UPDATE notebook_ai.work_assistant_requests SET status='INTERRUPTED',updated_at=now() WHERE owner_id=$1 AND status='RUNNING' AND created_at<now()-interval '3 minutes'", [actor.id]);
            const { rows: [usage], } = await client.query("SELECT count(*) FILTER(WHERE status='RUNNING')::int active,count(*) FILTER(WHERE created_at>now()-interval '1 minute')::int recent FROM notebook_ai.work_assistant_requests WHERE owner_id=$1 AND (status='RUNNING' OR created_at>now()-interval '1 minute')", [actor.id]);
            if (usage.active)
                throw new common_1.ConflictException("Một câu hỏi khác đang được xử lý.");
            if (usage.recent >= 8)
                throw new rate_limit_exception_1.TooManyRequestsException("Bạn hỏi quá nhanh. Vui lòng thử lại sau một phút.");
            await client.query("INSERT INTO notebook_ai.work_assistant_requests(id,session_id,owner_id) VALUES($1,$2,$3)", [requestId, session.id, actor.id]);
        });
    }
    async canceled(actor, id) {
        const [row] = await (0, database_1.rows)("SELECT cancel_requested,status FROM notebook_ai.work_assistant_requests WHERE id=$1 AND owner_id=$2", [id, actor.id]);
        return !row || row.cancel_requested || row.status !== "RUNNING";
    }
    async cancel(actor, id) {
        const result = await (0, database_1.rows)("UPDATE notebook_ai.work_assistant_requests SET cancel_requested=true WHERE id=$1 AND owner_id=$2 RETURNING id", [id, actor.id]);
        if (!result.length)
            throw new common_1.NotFoundException();
    }
    async finish(actor, session, requestId, question, content, sources, projectIds, metadata) {
        return (0, database_1.transaction)(async (client) => {
            const { rows: changed } = await client.query("UPDATE notebook_ai.work_assistant_requests SET status='COMPLETED',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING' AND NOT cancel_requested RETURNING id", [requestId, actor.id]);
            if (!changed.length)
                throw new common_1.ConflictException("Yêu cầu đã bị hủy.");
            const references = JSON.stringify(sources), ids = JSON.stringify(projectIds);
            await client.query("INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,project_ids,created_at) VALUES($1,$2,$3,'user',$4,$5::jsonb,clock_timestamp())", [(0, node_crypto_1.randomUUID)(), session.id, requestId, question, ids]);
            const { rows: [message], } = await client.query("INSERT INTO notebook_ai.work_assistant_messages(id,session_id,request_id,role,content,sources,project_ids,context,created_at) VALUES($1,$2,$3,'assistant',$4,$5::jsonb,$6::jsonb,$7::jsonb,clock_timestamp()) RETURNING *", [
                (0, node_crypto_1.randomUUID)(),
                session.id,
                requestId,
                content,
                references,
                ids,
                JSON.stringify(metadata),
            ]);
            await client.query("UPDATE notebook_ai.work_assistant_sessions SET updated_at=clock_timestamp() WHERE id=$1 AND owner_id=$2", [session.id, actor.id]);
            return message;
        });
    }
    async fail(actor, id, canceled) {
        await (0, database_1.rows)("UPDATE notebook_ai.work_assistant_requests SET status=$3,updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING' RETURNING id", [id, actor.id, canceled ? "CANCELED" : "FAILED"]);
    }
};
exports.WorkStore = WorkStore;
exports.WorkStore = WorkStore = __decorate([
    (0, common_1.Injectable)()
], WorkStore);
