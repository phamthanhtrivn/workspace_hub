"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const sse_1 = require("../../common/sse");
const abort_polling_1 = require("../../common/abort-polling");
const database_1 = require("../../infrastructure/database/database");
const document_client_1 = require("../../infrastructure/integrations/document.client");
const sources_service_1 = require("../sources/sources.service");
const notebook_access_1 = require("../../common/auth/notebook-access");
const evidence_policy_1 = require("../../common/evidence-policy");
const rag_client_1 = require("../../infrastructure/integrations/rag.client");
const chat_authorization_1 = require("./chat-authorization");
const env_config_1 = require("../../config/env.config");
const chat_response_1 = require("./chat-response");
const visual_evidence_1 = require("./visual-evidence");
const chat_request_1 = require("./chat-request");
const studio_service_1 = require("../studio/studio.service");
const summary_request_1 = require("./summary-request");
const chat_history_1 = require("./chat-history");
let ChatService = class ChatService {
    sources;
    studio;
    constructor(sources, studio) {
        this.sources = sources;
        this.studio = studio;
    }
    async answer(actor, notebookId, question, sourceIds, requestId, res) {
        const controller = new AbortController();
        const disconnect = () => controller.abort();
        res.once("close", disconnect);
        try {
            if (res.destroyed)
                return;
            await (0, notebook_access_1.ownedNotebook)(actor, notebookId);
            const sources = await this.selectedSources(notebookId, sourceIds);
            await (0, document_client_1.authorizeSources)(actor, sources, false, controller.signal);
            controller.signal.throwIfAborted();
            await (0, chat_request_1.startChatRequest)(actor.id, notebookId, requestId);
            await this.streamAnswer({
                actor,
                notebookId,
                question,
                sourceIds,
                requestId,
                res,
                sources,
                controller,
            });
        }
        finally {
            controller.abort();
            res.off("close", disconnect);
        }
    }
    async selectedSources(notebookId, sourceIds) {
        try {
            return (0, evidence_policy_1.selectSources)(sourceIds, await this.sources.sources(notebookId));
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async streamAnswer(input) {
        const { actor, notebookId, question, requestId, res, sources, controller } = input;
        const reply = (0, chat_response_1.immediateReply)(question);
        const snapshot = sources.map(({ id, revision }) => ({ id, revision }));
        const authorize = (0, chat_authorization_1.createChatAuthorization)({
            actor,
            sources,
            snapshot,
            loadSources: () => this.sources.sources(notebookId),
            signal: controller.signal,
        });
        const check = async () => {
            const [state] = await (0, database_1.rows)("SELECT status FROM notebook_ai.requests WHERE id=$1", [requestId]);
            if (state?.status !== "RUNNING")
                controller.abort();
        };
        const stopPolling = (0, abort_polling_1.pollUntilAborted)(controller, env_config_1.config.CHAT_CANCEL_POLL_MS, check);
        const permissions = setInterval(() => {
            if (!controller.signal.aborted)
                void authorize().catch(() => controller.abort());
        }, 3000);
        try {
            (0, sse_1.startEventStream)(res);
            (0, sse_1.event)(res, "status", {
                requestId,
                stage: reply ? "GENERATING" : "RETRIEVING",
            });
            controller.signal.throwIfAborted();
            const answer = await this.generateReply({
                ...input,
                snapshot,
                authorize,
            });
            await authorize();
            controller.signal.throwIfAborted();
            const id = await (0, chat_request_1.completeChatRequest)(requestId, notebookId, answer, snapshot, answer.artifactId);
            if (answer.artifactId)
                (0, sse_1.event)(res, "delta", { text: answer.content });
            (0, sse_1.event)(res, "done", { id, ...answer });
        }
        catch (error) {
            await (0, database_1.rows)("UPDATE notebook_ai.requests SET status=$2,updated_at=now() WHERE id=$1 AND status='RUNNING'", [requestId, controller.signal.aborted ? "CANCELLED" : "FAILED"]);
            (0, sse_1.event)(res, "error", {
                message: controller.signal.aborted
                    ? "Đã hủy câu trả lời."
                    : safeError(error),
            });
        }
        finally {
            stopPolling();
            clearInterval(permissions);
            controller.abort();
            res.end();
        }
    }
    async generateReply(input) {
        const { actor, notebookId, question, sourceIds, res, sources, snapshot, controller, authorize, } = input;
        const signal = controller.signal;
        const history = await this.history(notebookId, question, sources);
        signal.throwIfAborted();
        const reply = (0, chat_response_1.immediateReply)(question);
        const directReply = history.length && (0, chat_history_1.isFollowUp)(question) ? null : reply;
        await (0, database_1.rows)("INSERT INTO notebook_ai.messages(id,notebook_id,role,content,sources) VALUES($1,$2,'USER',$3,$4)", [(0, node_crypto_1.randomUUID)(), notebookId, question, JSON.stringify(snapshot)]);
        if ((0, summary_request_1.isNotebookSummaryRequest)(question)) {
            signal.throwIfAborted();
            const artifact = await this.studio.artifact(actor, notebookId, "SUMMARY", sourceIds);
            return {
                content: artifact.status === "COMPLETED"
                    ? artifact.content
                    : "Mình đang đọc tài liệu để tóm tắt. Kết quả sẽ xuất hiện ngay tại đây khi hoàn tất.",
                citations: artifact.status === "COMPLETED" ? artifact.citations : [],
                artifactId: artifact.id,
            };
        }
        const citations = directReply
            ? []
            : (0, evidence_policy_1.citeEvidence)((await (0, rag_client_1.retrieve)(notebookId, sourceIds, (0, chat_history_1.retrievalQuestion)(question, history), signal)).evidence, sources);
        signal.throwIfAborted();
        (0, sse_1.event)(res, "status", { stage: "GENERATING" });
        const images = await (0, visual_evidence_1.visualEvidence)(question, citations, sources);
        await authorize();
        return (0, chat_response_1.generateChatResponse)(question, citations, signal, (text) => (0, sse_1.event)(res, "delta", { text }), history, images);
    }
    async history(notebookId, question, sources) {
        if ((0, chat_response_1.immediateReply)(question) && !(0, chat_history_1.isFollowUp)(question))
            return [];
        const previous = await (0, database_1.rows)(`SELECT m.role, CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,m.sources
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.notebook_id=$1 AND (m.artifact_id IS NULL OR a.status='COMPLETED')
         AND (m.role='USER' OR jsonb_array_length(m.citations)>0 OR a.status='COMPLETED')
         ORDER BY m.created_at DESC,m.id DESC LIMIT 12`, [notebookId]);
        return (0, chat_history_1.conversationHistory)(previous.reverse(), sources);
    }
    async cancel(actor, requestId) {
        await (0, database_1.rows)("UPDATE notebook_ai.requests SET status='CANCELLED',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING'", [requestId, actor.id]);
        await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET status='CANCELLED',updated_at=now() WHERE id=$1 AND notebook_id IN(SELECT id FROM notebook_ai.notebooks WHERE owner_id=$2) AND status IN ('QUEUED','RUNNING')", [requestId, actor.id]);
        return {};
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sources_service_1.SourcesService,
        studio_service_1.StudioService])
], ChatService);
function safeError(error) {
    const message = error?.message ?? "";
    if (/hạn mức|HTTP \d{3}|bị cắt|trích dẫn|thiếu trích|phiên bản|Mất quyền/i.test(message))
        return message;
    return "AI chưa hoàn tất yêu cầu. Kiểm tra kết nối/model và thử lại; yêu cầu không được tự gửi lại.";
}
