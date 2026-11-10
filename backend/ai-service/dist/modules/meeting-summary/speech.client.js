"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechRecognitionError = void 0;
exports.recognizeMeetingChunk = recognizeMeetingChunk;
const promises_1 = require("node:fs/promises");
const zod_1 = require("zod");
const env_config_1 = require("../../config/env.config");
class SpeechRecognitionError extends Error {
    status;
    constructor(status) {
        super(`Local speech worker HTTP ${status}`);
        this.status = status;
    }
}
exports.SpeechRecognitionError = SpeechRecognitionError;
const speechResponse = zod_1.z.object({ text: zod_1.z.string().max(12000) }).strict();
async function recognizeMeetingChunk(path, signal) {
    signal.throwIfAborted();
    const audio = await (0, promises_1.readFile)(path);
    if (!audio.length || audio.length > 2 * 1024 * 1024)
        throw new Error("Audio chunk is too large or empty");
    const response = await fetch(env_config_1.config.MEETING_STT_URL.replace(/\/$/, "") + "/transcribe", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(env_config_1.config.MEETING_STT_TIMEOUT_MS),
        ]),
        headers: {
            "x-internal-service-key": env_config_1.config.MEETING_STT_SERVICE_KEY,
            "content-type": "audio/wav",
        },
        body: audio,
    });
    if (!response.ok) {
        await response.body?.cancel();
        throw new SpeechRecognitionError(response.status);
    }
    const reader = response.body?.getReader();
    if (!reader)
        throw new Error("Empty local speech response");
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            const part = await reader.read();
            if (part.done)
                break;
            size += part.value.length;
            if (size > 65536)
                throw new Error("Local speech response exceeds limit");
            chunks.push(part.value);
        }
    }
    finally {
        await reader.cancel().catch(() => undefined);
    }
    return speechResponse
        .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")))
        .text.trim();
}
