"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualEvidence = visualEvidence;
const env_config_1 = require("../../config/env.config");
const database_1 = require("../../infrastructure/database/database");
async function visualEvidence(question, evidence, sources) {
    const plain = question
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/đ/g, "d");
    if (env_config_1.config.VISUAL_ENABLED !== "true" ||
        !/\b(hinh|anh|bieu do|so do|cong thuc|bang|image|picture|figure|chart|diagram|graph|table)\b/.test(plain))
        return [];
    const ready = new Map(sources
        .filter((source) => source.status === "READY")
        .map((source) => [source.id, source]));
    const candidates = [];
    const seen = new Set();
    for (const item of evidence) {
        const source = ready.get(item.sourceId);
        if (!source || !item.imageId || !/^[a-f0-9]{64}$/.test(item.imageId))
            continue;
        const key = `${source.id}:${item.imageId}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        candidates.push({
            source_id: source.id,
            revision: source.revision,
            image_id: item.imageId,
            label: item.label,
            position: candidates.length,
        });
    }
    if (!candidates.length)
        return [];
    const images = await (0, database_1.rows)("SELECT requested.label,v.data_url FROM jsonb_to_recordset($1::jsonb) AS requested(source_id uuid,revision text,image_id text,label text,position int) JOIN notebook_ai.source_visuals v ON v.source_id=requested.source_id AND v.revision=requested.revision AND v.image_id=requested.image_id ORDER BY requested.position LIMIT 2", [JSON.stringify(candidates)]);
    return images.map((image) => ({
        label: image.label,
        dataUrl: image.data_url,
    }));
}
