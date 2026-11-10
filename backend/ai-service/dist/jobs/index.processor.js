"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexSource = indexSource;
const bullmq_1 = require("bullmq");
const common_1 = require("@nestjs/common");
const database_1 = require("../infrastructure/database/database");
const document_client_1 = require("../infrastructure/integrations/document.client");
const rag_client_1 = require("../infrastructure/integrations/rag.client");
const upload_validation_1 = require("../modules/sources/upload-validation");
const pipeline_profiler_1 = require("../common/profiling/pipeline-profiler");
const env_config_1 = require("../config/env.config");
const visual_ingestion_1 = require("./visual-ingestion");
async function indexSource(id) {
    const [source] = await (0, database_1.rows)(`SELECT s.*,n.owner_id FROM notebook_ai.sources s
    JOIN notebook_ai.notebooks n ON n.id=s.notebook_id WHERE s.id=$1`, [id]);
    if (!source || source.status === "READY")
        return;
    const actor = { id: source.owner_id, email: source.owner_email };
    const timing = new pipeline_profiler_1.Profile("index");
    let completed = false;
    try {
        const [manifest] = await timing.measure("authorize_ms", () => (0, document_client_1.authorizeSources)(actor, [source], true));
        await (0, database_1.rows)("UPDATE notebook_ai.sources SET status='INDEXING',progress=10,error=NULL,updated_at=now() WHERE id=$1", [id]);
        const data = await timing.measure("download_ms", () => (0, upload_validation_1.downloadSource)(manifest));
        if (data.length !== Number(source.size_bytes))
            throw new bullmq_1.UnrecoverableError("Kích thước phiên bản nguồn không khớp");
        await (0, database_1.rows)("UPDATE notebook_ai.sources SET progress=30,updated_at=now() WHERE id=$1 AND status='INDEXING'", [id]);
        const content = await timing.measure("encode_ms", () => data.toString("base64"));
        const enriched = env_config_1.config.VISUAL_ENABLED === "true" &&
            /\.(pdf|docx|png|jpe?g|webp)$/i.test(source.name)
            ? await (0, visual_ingestion_1.enrichVisualSource)(source, actor, content)
            : {};
        await (0, database_1.rows)("UPDATE notebook_ai.sources SET progress=85,updated_at=now() WHERE id=$1 AND status='INDEXING'", [id]);
        const result = await timing.measure("rag_ms", () => (0, rag_client_1.rag)("/index", {
            scopeId: source.notebook_id,
            sourceId: id,
            revision: source.revision,
            name: source.name,
            content,
            ...enriched,
        }, AbortSignal.timeout(240000)));
        await timing.measure("authorize_ms", () => (0, document_client_1.authorizeSources)(actor, [source]));
        const updated = await timing.measure("finalize_ms", () => (0, database_1.rows)("UPDATE notebook_ai.sources SET status='READY',progress=100,chunk_count=$2,index_version=$3,updated_at=now() WHERE id=$1 RETURNING id", [id, result.chunkCount, "pages" in enriched ? "visual-v1" : "text-v1"]));
        if (!updated.length)
            await (0, rag_client_1.rag)("/delete", { scopeId: source.notebook_id, sourceId: id });
        completed = true;
    }
    catch (error) {
        const failure = error instanceof common_1.HttpException &&
            error.getStatus() >= 400 &&
            error.getStatus() < 500 &&
            error.getStatus() !== 429
            ? new bullmq_1.UnrecoverableError(error.message)
            : error;
        await (0, database_1.rows)("UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now() WHERE id=$1", [
            id,
            failure instanceof bullmq_1.UnrecoverableError
                ? failure.message
                : failure instanceof Error && "getStatus" in failure
                    ? failure.message
                    : "INDEX_DEPENDENCY_FAILED: Không tải hoặc xử lý được nguồn. Kiểm tra Document Service, RAG worker và bộ nhớ; thử lại khi dịch vụ sẵn sàng.",
        ]);
        throw failure;
    }
    finally {
        timing.finish(completed ? "ok" : "failed");
    }
}
