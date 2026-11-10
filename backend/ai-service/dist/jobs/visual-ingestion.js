"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichVisualSource = enrichVisualSource;
const node_crypto_1 = require("node:crypto");
const abort_polling_1 = require("../common/abort-polling");
const promises_1 = require("node:timers/promises");
const zod_1 = require("zod");
const bullmq_1 = require("bullmq");
const env_config_1 = require("../config/env.config");
const model_quota_exception_1 = require("../common/errors/model-quota.exception");
const database_1 = require("../infrastructure/database/database");
const document_client_1 = require("../infrastructure/integrations/document.client");
const rag_client_1 = require("../infrastructure/integrations/rag.client");
const vision_client_1 = require("../infrastructure/integrations/vision.client");
const hash = (value) => (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
const digest = zod_1.z.string().regex(/^[a-f0-9]{64}$/);
const page = zod_1.z.number().int().min(1).max(100).nullable();
const extractionSchema = zod_1.z.object({
    pages: zod_1.z
        .array(zod_1.z.object({
        text: zod_1.z.string().max(500000),
        page,
        imageId: digest.nullable().optional(),
    }))
        .max(100),
    images: zod_1.z
        .array(zod_1.z.object({
        id: digest,
        hash: digest,
        page,
        context: zod_1.z.string().max(6000),
        dataUrl: zod_1.z
            .string()
            .max(1400000)
            .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/),
    }))
        .max(24),
});
const EXTRACTION_PIPELINE = "visual-v1";
async function extractOnce(source, content, signal) {
    const [cached] = await (0, database_1.rows)("SELECT payload FROM notebook_ai.source_extractions WHERE source_id=$1 AND revision=$2 AND pipeline=$3", [source.id, source.revision, EXTRACTION_PIPELINE]);
    if (cached) {
        const images = await (0, database_1.rows)("SELECT image_id,data_url FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2", [source.id, source.revision]);
        const byId = new Map(images.map((image) => [image.image_id, image.data_url]));
        const parsed = extractionSchema.safeParse({
            ...cached.payload,
            images: cached.payload.images.map((image) => ({
                ...image,
                dataUrl: byId.get(image.id),
            })),
        });
        if (parsed.success)
            return parsed.data;
    }
    const extracted = extractionSchema.parse(await (0, rag_client_1.rag)("/extract", { scopeId: source.notebook_id, name: source.name, content }, AbortSignal.any([signal, AbortSignal.timeout(210000)])));
    for (const image of extracted.images) {
        if (hash(Buffer.from(image.dataUrl.split(",")[1], "base64")) !== image.hash)
            throw new bullmq_1.UnrecoverableError("Ảnh trích xuất không khớp mã kiểm tra");
    }
    const payload = {
        ...extracted,
        images: extracted.images.map(({ dataUrl: _dataUrl, ...metadata }) => metadata),
    };
    await (0, database_1.transaction)(async (client) => {
        for (const image of extracted.images)
            await client.query(`INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,page,data_url,context)
       VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(source_id,revision,image_id) DO UPDATE SET context=excluded.context`, [
                source.id,
                source.revision,
                image.id,
                image.hash,
                image.page,
                image.dataUrl,
                image.context,
            ]);
        await client.query("INSERT INTO notebook_ai.source_extractions(source_id,revision,pipeline,payload) VALUES($1,$2,$3,$4) ON CONFLICT(source_id,revision,pipeline) DO UPDATE SET payload=excluded.payload", [
            source.id,
            source.revision,
            EXTRACTION_PIPELINE,
            JSON.stringify(payload),
        ]);
    });
    return extracted;
}
async function enrichVisualSource(source, actor, content) {
    const controller = new AbortController();
    const deadline = AbortSignal.timeout(15 * 60_000);
    const signal = AbortSignal.any([controller.signal, deadline]);
    const authorize = async () => {
        const [current] = await (0, database_1.rows)("SELECT revision,status FROM notebook_ai.sources WHERE id=$1 AND notebook_id=$2", [source.id, source.notebook_id]);
        if (!current ||
            current.revision !== source.revision ||
            current.status !== "INDEXING")
            throw new bullmq_1.UnrecoverableError("Nguồn đã bị xóa hoặc thay đổi khi đọc ảnh");
        await (0, document_client_1.authorizeSources)(actor, [source]);
        signal.throwIfAborted();
    };
    const stopPolling = (0, abort_polling_1.pollUntilAborted)(controller, 3000, authorize);
    try {
        await authorize();
        const result = await extractOnce(source, content, signal);
        const visuals = [];
        for (const [index, image] of result.images.entries()) {
            await authorize();
            if (hash(Buffer.from(image.dataUrl.split(",")[1], "base64")) !== image.hash)
                throw new bullmq_1.UnrecoverableError("Ảnh trích xuất không khớp mã kiểm tra");
            const contextHash = hash(image.context);
            const [cached] = await (0, database_1.rows)(`SELECT description FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2 AND image_hash=$3 AND context_hash=$4 AND model=$5 AND prompt_version=$6 LIMIT 1`, [
                source.id,
                source.revision,
                image.hash,
                contextHash,
                env_config_1.config.LLM_MODEL,
                vision_client_1.VISION_PROMPT_VERSION,
            ]);
            let description = cached?.description;
            while (!description) {
                await authorize();
                try {
                    description = await (0, vision_client_1.describeImage)(image.dataUrl, image.context, signal);
                }
                catch (error) {
                    if (!(error instanceof model_quota_exception_1.ModelMinuteQuotaException))
                        throw error;
                    await (0, promises_1.setTimeout)(1500, undefined, { signal });
                }
            }
            await authorize();
            await (0, database_1.rows)(`INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,context_hash,model,prompt_version,page,data_url,description)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT(source_id,revision,image_id) DO UPDATE SET context_hash=excluded.context_hash,model=excluded.model,prompt_version=excluded.prompt_version,data_url=excluded.data_url,description=excluded.description`, [
                source.id,
                source.revision,
                image.id,
                image.hash,
                contextHash,
                env_config_1.config.LLM_MODEL,
                vision_client_1.VISION_PROMPT_VERSION,
                image.page,
                image.dataUrl,
                description,
            ]);
            visuals.push({
                text: `Nội dung đọc từ hình${image.page ? ` tại trang ${image.page}` : ""}:\n${description}`,
                page: image.page,
                imageId: image.id,
            });
            await (0, database_1.rows)("UPDATE notebook_ai.sources SET progress=$2,updated_at=now() WHERE id=$1 AND status='INDEXING'", [source.id, 40 + Math.floor(((index + 1) / result.images.length) * 40)]);
        }
        return { pages: result.pages, visuals };
    }
    finally {
        stopPolling();
    }
}
