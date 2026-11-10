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
exports.NotebooksService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("../../infrastructure/database/database");
const notebook_access_1 = require("../../common/auth/notebook-access");
const sources_service_1 = require("../sources/sources.service");
const evidence_policy_1 = require("../../common/evidence-policy");
const node_crypto_1 = require("node:crypto");
const notebook_queue_1 = require("../../infrastructure/queue/notebook.queue");
let NotebooksService = class NotebooksService {
    sourcesService;
    constructor(sourcesService) {
        this.sourcesService = sourcesService;
    }
    list(actor) {
        return (0, database_1.rows)("SELECT * FROM notebook_ai.notebooks WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100", [actor.id]);
    }
    async create(actor, title) {
        return (await (0, database_1.rows)("INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$2,$3) RETURNING *", [(0, node_crypto_1.randomUUID)(), actor.id, title]))[0];
    }
    async rename(actor, id, title) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        return (await (0, database_1.rows)("UPDATE notebook_ai.notebooks SET title=$2,updated_at=now() WHERE id=$1 RETURNING *", [id, title]))[0];
    }
    async remove(actor, id) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        // The cleanup job survives the notebook row deletion and is restricted to its scope.
        await (0, notebook_queue_1.enqueue)("cleanup", id, { scopeId: id });
        await (0, database_1.rows)("DELETE FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2", [id, actor.id]);
    }
    async get(actor, id) {
        const notebook = await (0, notebook_access_1.ownedNotebook)(actor, id);
        const sources = await this.sourcesService.checkedSources(actor, id);
        const [messages, notes, artifacts] = await Promise.all([
            (0, database_1.rows)(`SELECT m.*, a.status AS summary_status,
          CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,
          CASE WHEN a.status='COMPLETED' THEN a.citations ELSE m.citations END AS citations,
          a.error AS summary_error
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.notebook_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 100`, [id]),
            (0, database_1.rows)("SELECT * FROM notebook_ai.notes WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 100", [id]),
            (0, database_1.rows)("SELECT id,notebook_id,kind,status,progress,content,citations,sources,error,created_at FROM notebook_ai.artifacts WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 30", [id]),
        ]);
        const mask = (item) => (0, evidence_policy_1.visibleSnapshot)(item.sources, sources)
            ? item
            : {
                ...item,
                content: "",
                citations: [],
                status: "STALE",
                hidden: true,
            };
        return {
            ...notebook,
            sources: sources.map(({ owner_email: _email, ...source }) => source),
            messages: messages.reverse().map(mask),
            notes: notes.map(mask),
            artifacts: artifacts.map(mask),
        };
    }
};
exports.NotebooksService = NotebooksService;
exports.NotebooksService = NotebooksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sources_service_1.SourcesService])
], NotebooksService);
