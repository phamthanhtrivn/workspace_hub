"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeMeeting = transcribeMeeting;
exports.summarizeMeeting = summarizeMeeting;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const env_config_1 = require("../../config/env.config");
const media_1 = require("./media");
const speech_client_1 = require("./speech.client");
const summary_1 = require("./summary");
const limits_1 = require("./limits");
async function transcribeMeeting(source, context) {
    const { state, signal, authorize, checkpoint, measure } = context;
    if (state.transcript_complete)
        return;
    const directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "meeting-summary-"));
    try {
        const files = await measure("audio_ms", () => (0, media_1.prepareMeetingAudio)(source, directory, signal));
        const completed = new Set(state.transcript.map((chunk) => chunk.startSeconds / media_1.AUDIO_CHUNK_SECONDS));
        if (completed.size !== state.transcript.length ||
            [...completed].some((index) => !Number.isInteger(index) || index < 0 || index >= files.length))
            throw new Error("Invalid transcript checkpoint");
        const pending = files
            .map((_file, index) => index)
            .filter((index) => !completed.has(index));
        await checkpoint("TRANSCRIBING");
        for (let offset = 0; offset < pending.length; offset += env_config_1.config.MEETING_STT_CONCURRENCY) {
            const wave = pending.slice(offset, offset + env_config_1.config.MEETING_STT_CONCURRENCY);
            const results = await measure("speech_ms", () => Promise.allSettled(wave.map(async (index) => {
                await authorize();
                const text = await (0, speech_client_1.recognizeMeetingChunk)(files[index], signal);
                signal.throwIfAborted();
                return { startSeconds: index * media_1.AUDIO_CHUNK_SECONDS, text };
            })));
            // Drain all in-flight calls before cleanup, and preserve successes even if another chunk failed.
            for (const result of results)
                if (result.status === "fulfilled")
                    state.transcript.push(result.value);
            state.transcript.sort((a, b) => a.startSeconds - b.startSeconds);
            await checkpoint("TRANSCRIBING");
            const failed = results.find((result) => result.status === "rejected");
            if (failed?.status === "rejected")
                throw failed.reason;
        }
        state.transcript_complete = true;
        await checkpoint("TRANSCRIBING");
    }
    finally {
        if ((0, node_path_1.dirname)(directory) === (0, node_os_1.tmpdir)() &&
            (0, node_path_1.basename)(directory).startsWith("meeting-summary-"))
            await (0, promises_1.rm)(directory, { recursive: true, force: true });
    }
}
async function summarizeMeeting(context) {
    const { state, signal, authorize, checkpoint, measure } = context;
    let batches = (0, summary_1.transcriptBatches)(state.transcript);
    if (!batches.length)
        throw new Error("No speech recognized");
    await checkpoint("SUMMARIZING");
    // Each level shrinks the input; checkpoint completed model outputs for explicit retries.
    for (let level = 0; batches.length > 1; level++) {
        if (level >= limits_1.MEETING_LIMITS.reductionLevels)
            throw new Error("Meeting summary reduction limit");
        const notes = [];
        for (const batch of batches) {
            const hash = (0, summary_1.meetingSummaryCacheKey)(batch);
            let saved = state.partials.find((item) => item.hash === hash);
            if (!saved) {
                await authorize();
                const text = await measure("model_ms", () => (0, summary_1.meetingSummaryText)(batch, false, signal));
                if (text.length > limits_1.MEETING_LIMITS.noteCharacters)
                    throw new Error("Meeting notes did not shrink");
                saved = { hash, text };
                state.partials.push(saved);
                await checkpoint("SUMMARIZING");
            }
            notes.push(saved.text);
        }
        batches = [];
        let group = "";
        for (const note of notes) {
            if (group.length + note.length + 2 > limits_1.MEETING_LIMITS.batchCharacters) {
                batches.push(group);
                group = "";
            }
            group += (group ? "\n\n" : "") + note;
        }
        if (group)
            batches.push(group);
    }
    await authorize();
    const content = await measure("model_ms", () => (0, summary_1.meetingSummaryText)(batches[0], true, signal));
    await authorize();
    signal.throwIfAborted();
    return content;
}
