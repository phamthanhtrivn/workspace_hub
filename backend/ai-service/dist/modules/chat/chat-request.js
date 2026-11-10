"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startChatRequest = startChatRequest;
exports.completeChatRequest = completeChatRequest;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_1 = require("../../infrastructure/database/database");
const rate_limit_exception_1 = require("../../common/errors/rate-limit.exception");
async function startChatRequest(ownerId, notebookId, requestId) {
    try {
        await (0, database_1.transaction)(async (client) => {
            await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,8087))", [ownerId]);
            const { rows: [usage], } = await client.query(`SELECT count(*) FILTER (WHERE status='RUNNING')::int active,
        count(*) FILTER (WHERE created_at>now()-interval '1 minute')::int recent
        FROM notebook_ai.requests WHERE owner_id=$1`, [ownerId]);
            if (usage.active >= 2 || usage.recent >= 10)
                throw new rate_limit_exception_1.TooManyRequestsException("Bạn đang có nhiều yêu cầu; chờ hoặc hủy câu trả lời trước.");
            await client.query("INSERT INTO notebook_ai.requests(id,notebook_id,owner_id) VALUES($1,$2,$3)", [requestId, notebookId, ownerId]);
        });
    }
    catch (error) {
        if (error.code === "23505")
            throw new common_1.ConflictException("Notebook đang có câu trả lời hoặc request đã được gửi");
        throw error;
    }
}
async function completeChatRequest(requestId, notebookId, answer, snapshot, artifactId) {
    const id = (0, node_crypto_1.randomUUID)();
    await (0, database_1.transaction)(async (client) => {
        const { rows: [request], } = await client.query("SELECT status FROM notebook_ai.requests WHERE id=$1 FOR UPDATE", [requestId]);
        if (request?.status !== "RUNNING")
            throw new Error("Yêu cầu đã hủy");
        await client.query("INSERT INTO notebook_ai.messages(id,notebook_id,role,content,citations,sources,artifact_id) VALUES($1,$2,'ASSISTANT',$3,$4,$5,$6)", [
            id,
            notebookId,
            answer.content,
            JSON.stringify(answer.citations),
            JSON.stringify(snapshot),
            artifactId ?? null,
        ]);
        await client.query("UPDATE notebook_ai.requests SET status='COMPLETED',updated_at=now() WHERE id=$1", [requestId]);
    });
    return id;
}
