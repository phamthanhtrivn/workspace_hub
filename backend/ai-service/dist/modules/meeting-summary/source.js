"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceSchema = void 0;
exports.meetingSource = meetingSource;
const zod_1 = require("zod");
const env_config_1 = require("../../config/env.config");
exports.sourceSchema = zod_1.z.object({
    recordingId: zod_1.z.uuid(),
    revision: zod_1.z.string().regex(/^[a-f0-9]{64}$/),
    url: zod_1.z.url(),
    sizeBytes: zod_1.z.number().int().positive(),
    durationSeconds: zod_1.z.number().positive(),
});
async function meetingSource(id, actorId, signal) {
    const response = await fetch(`${env_config_1.config.COMMUNICATION_SERVICE_URL.replace(/\/$/, "")}/internal/meeting-summaries/${id}/source`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        headers: {
            "content-type": "application/json",
            "x-internal-service-key": env_config_1.config.AI_COMMUNICATION_SERVICE_KEY,
        },
        body: JSON.stringify({ actorId }),
    });
    if (!response.ok) {
        await response.body?.cancel();
        throw new Error("Recording access unavailable");
    }
    const payload = (await response.json());
    const source = exports.sourceSchema.parse(payload.data);
    if (source.recordingId !== id ||
        source.sizeBytes > env_config_1.config.MEETING_SUMMARY_MAX_BYTES ||
        source.durationSeconds > env_config_1.config.MEETING_SUMMARY_MAX_SECONDS)
        throw new Error("Recording exceeds summary limits");
    return source;
}
