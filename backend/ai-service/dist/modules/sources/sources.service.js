"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourcesService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const database_1 = require("../../infrastructure/database/database");
const document_client_1 = require("../../infrastructure/integrations/document.client");
const notebook_queue_1 = require("../../infrastructure/queue/notebook.queue");
const notebook_access_1 = require("../../common/auth/notebook-access");
const upload_validation_1 = require("./upload-validation");
let SourcesService = class SourcesService {
    sources(id) {
        return (0, database_1.rows)("SELECT * FROM notebook_ai.sources WHERE notebook_id=$1 ORDER BY created_at,id", [id]);
    }
    async checkedSources(actor, id) {
        const sources = await this.sources(id);
        if (sources.length > 1) {
            try {
                await (0, document_client_1.authorizeSources)(actor, sources);
                return sources;
            }
            catch (error) {
                if (!(error instanceof common_1.ForbiddenException))
                    throw error;
                // Identify revoked/changed files individually only after a batch denial.
            }
        }
        await Promise.all(sources.map(async (source) => {
            try {
                await (0, document_client_1.authorizeSources)(actor, [source]);
            }
            catch (error) {
                if (!(error instanceof common_1.ForbiddenException))
                    throw error;
                source.status = "UNAVAILABLE";
                source.error = "Mất quyền hoặc phiên bản nguồn đã thay đổi";
            }
        }));
        return sources;
    }
    async add(actor, id, refs) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        const manifests = await (0, document_client_1.resolveDocuments)(actor, refs);
        const existingSources = await this.sources(id);
        (0, upload_validation_1.checkManifests)(existingSources, manifests);
        await (0, upload_validation_1.withUploadCheck)(async () => {
            // Validate actual stored bytes, not a client assertion or the filename alone.
            // Resolve signed URLs just in time, so later files cannot use expired URLs.
            for (const m of manifests) {
                const [current] = await (0, document_client_1.resolveDocuments)(actor, [{ documentId: m.documentId, versionId: m.versionId }], true);
                if (!current?.current ||
                    current.documentId !== m.documentId ||
                    current.versionId !== m.versionId ||
                    current.revision !== m.revision)
                    throw new common_1.BadRequestException("Nguồn đã thay đổi. Hãy chọn lại tài liệu.");
                await (0, upload_validation_1.validateContent)(current.name, await (0, upload_validation_1.downloadSource)(current), id);
            }
        });
        const added = await (0, database_1.transaction)(async (client) => {
            const locked = await client.query("SELECT id FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, actor.id]);
            if (!locked.rows.length)
                throw new common_1.NotFoundException();
            const existing = await client.query("SELECT * FROM notebook_ai.sources WHERE notebook_id=$1", [id]);
            (0, upload_validation_1.checkManifests)(existing.rows, manifests);
            const result = [];
            for (const m of manifests) {
                const { rows: [source], } = await client.query(`INSERT INTO notebook_ai.sources(id,notebook_id,document_id,version_id,revision,name,size_bytes,owner_email)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(notebook_id,document_id,version_id) DO UPDATE SET name=excluded.name RETURNING *`, [
                    (0, node_crypto_1.randomUUID)(),
                    id,
                    m.documentId,
                    m.versionId,
                    m.revision,
                    m.name,
                    m.sizeBytes,
                    actor.email,
                ]);
                result.push(source);
            }
            return result;
        });
        for (const source of added)
            if (source.status === "QUEUED")
                await (0, notebook_queue_1.enqueue)("index", source.id, { sourceId: source.id });
        return added;
    }
    async visual(actor, id, sourceId, imageId) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        const source = (await this.sources(id)).find((item) => item.id === sourceId && item.status === "READY");
        if (!source || !/^[a-f0-9]{64}$/.test(imageId))
            throw new common_1.NotFoundException();
        await (0, document_client_1.authorizeSources)(actor, [source]);
        const [image] = await (0, database_1.rows)("SELECT data_url,description FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2 AND image_id=$3", [source.id, source.revision, imageId]);
        if (!image)
            throw new common_1.NotFoundException();
        await (0, document_client_1.authorizeSources)(actor, [source]);
        return { dataUrl: image.data_url, description: image.description };
    }
    async sourceAction(actor, id, sourceId, action) {
        await (0, notebook_access_1.ownedNotebook)(actor, id);
        const source = (await this.sources(id)).find((item) => item.id === sourceId);
        if (!source)
            throw new common_1.NotFoundException();
        if (action === "remove") {
            await (0, notebook_queue_1.enqueue)("cleanup", source.id, { scopeId: id, sourceId });
            await (0, database_1.rows)("DELETE FROM notebook_ai.sources WHERE id=$1", [sourceId]);
            return {};
        }
        const [manifest] = await (0, document_client_1.authorizeSources)(actor, [source], action === "preview");
        if (action === "preview")
            return { url: manifest.downloadUrl };
        if (!["FAILED", "QUEUED", "READY"].includes(source.status))
            throw new common_1.BadRequestException("Nguồn đang xử lý");
        await (0, upload_validation_1.withUploadCheck)(async () => {
            const [file] = await (0, document_client_1.authorizeSources)(actor, [source], true);
            await (0, upload_validation_1.validateContent)(file.name, await (0, upload_validation_1.downloadSource)(file), id);
        });
        await (0, database_1.rows)("UPDATE notebook_ai.sources SET status='QUEUED',error=NULL,progress=0,updated_at=now() WHERE id=$1", [sourceId]);
        await (0, notebook_queue_1.enqueue)("index", sourceId, { sourceId });
        return {};
    }
};
exports.SourcesService = SourcesService;
exports.SourcesService = SourcesService = __decorate([
    (0, common_1.Injectable)()
], SourcesService);
