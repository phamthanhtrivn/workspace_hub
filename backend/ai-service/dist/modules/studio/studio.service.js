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
exports.StudioService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("../../infrastructure/database/database");
const notebook_access_1 = require("../../common/auth/notebook-access");
const sources_service_1 = require("../sources/sources.service");
const evidence_policy_1 = require("../../common/evidence-policy");
const node_crypto_1 = require("node:crypto");
const notebook_queue_1 = require("../../infrastructure/queue/notebook.queue");
const env_config_1 = require("../../config/env.config");
let StudioService = class StudioService {
    sourcesService;
    constructor(sourcesService) {
        this.sourcesService = sourcesService;
    }
    async note(actor, id, data) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        if (data.messageId && data.noteId)
            throw new common_1.BadRequestException("Không thể gộp ghi chú và câu trả lời");
        let content = data.content ?? "";
        let sources = [];
        let citations = [];
        let kind = "MANUAL";
        if (data.messageId) {
            const [message] = await (0, database_1.rows)(`SELECT m.*,a.status AS summary_status,
          CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,
          CASE WHEN a.status='COMPLETED' THEN a.citations ELSE m.citations END AS citations
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.id=$1 AND m.notebook_id=$2 AND m.role='ASSISTANT'`, [data.messageId, id]);
            if (!message)
                throw new common_1.NotFoundException();
            if (message.artifact_id && message.summary_status !== "COMPLETED")
                throw new common_1.BadRequestException("Chờ bản tóm tắt hoàn tất trước khi lưu ghi chú.");
            if (!(0, evidence_policy_1.visibleSnapshot)(message.sources, await this.sourcesService.checkedSources(actor, id)))
                throw new common_1.ForbiddenException();
            content = message.content;
            sources = message.sources;
            citations = message.citations;
            kind = "SAVED_AI";
        }
        if (data.noteId) {
            const [note] = await (0, database_1.rows)("SELECT * FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2", [data.noteId, id]);
            if (!note ||
                !(0, evidence_policy_1.visibleSnapshot)(note.sources, await this.sourcesService.checkedSources(actor, id)))
                throw new common_1.NotFoundException();
            return (await (0, database_1.rows)("UPDATE notebook_ai.notes SET title=$3,content=$4,updated_at=now() WHERE id=$1 AND notebook_id=$2 RETURNING *", [data.noteId, id, data.title, content]))[0];
        }
        return (await (0, database_1.rows)("INSERT INTO notebook_ai.notes(id,notebook_id,title,content,sources,citations,kind) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *", [
            (0, node_crypto_1.randomUUID)(),
            id,
            data.title,
            content,
            JSON.stringify(sources),
            JSON.stringify(citations),
            kind,
        ]))[0];
    }
    async deleteNote(actor, id, noteId) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        await (0, database_1.rows)("DELETE FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2", [
            noteId,
            id,
        ]);
    }
    async artifact(actor, id, kind, sourceIds) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        const available = await this.sourcesService.checkedSources(actor, id);
        let sources = available;
        if (sourceIds) {
            try {
                sources = (0, evidence_policy_1.selectSources)(sourceIds, available);
            }
            catch (cause) {
                throw new common_1.BadRequestException(cause.message);
            }
        }
        if (!sources.length || sources.some((s) => s.status !== "READY"))
            throw new common_1.BadRequestException("Chờ tất cả nguồn sẵn sàng trước khi tạo tổng quan");
        const snapshot = sources.map((s) => ({ id: s.id, revision: s.revision }));
        const key = (0, node_crypto_1.createHash)("sha256")
            .update(JSON.stringify({
            snapshot,
            kind,
            prompt: "source-key-points-v3",
            ...(sources.some((source) => source.index_version === "visual-v1")
                ? { visualPipeline: "visual-v1" }
                : {}),
            provider: env_config_1.config.LLM_BASE_URL.replace(/\/$/, ""),
            model: env_config_1.config.LLM_MODEL,
            maxTokens: env_config_1.config.LLM_MAX_TOKENS,
            language: "vi",
        }))
            .digest("hex");
        const [artifact] = await (0, database_1.rows)(`INSERT INTO notebook_ai.artifacts(id,notebook_id,kind,cache_key,sources,owner_email) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(notebook_id,cache_key) DO UPDATE SET
      in_flight=CASE WHEN notebook_ai.artifacts.status IN ('FAILED','CANCELLED') THEN false ELSE notebook_ai.artifacts.in_flight END,
      status=CASE WHEN notebook_ai.artifacts.status IN ('FAILED','CANCELLED') THEN 'QUEUED' ELSE notebook_ai.artifacts.status END,error=NULL RETURNING *`, [(0, node_crypto_1.randomUUID)(), id, kind, key, JSON.stringify(snapshot), actor.email]);
        if (artifact.status === "QUEUED")
            await (0, notebook_queue_1.enqueue)("summary", artifact.id, { artifactId: artifact.id });
        return artifact;
    }
};
exports.StudioService = StudioService;
exports.StudioService = StudioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sources_service_1.SourcesService])
], StudioService);
