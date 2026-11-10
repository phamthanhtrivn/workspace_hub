"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIO_CHUNK_SECONDS = void 0;
exports.assertMediaUrl = assertMediaUrl;
exports.prepareMeetingAudio = prepareMeetingAudio;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_stream_1 = require("node:stream");
const promises_2 = require("node:stream/promises");
const node_path_1 = require("node:path");
const env_config_1 = require("../../config/env.config");
exports.AUDIO_CHUNK_SECONDS = 45;
function assertMediaUrl(value) {
    const url = new URL(value);
    const allowed = env_config_1.config.MEETING_MEDIA_HOSTS.split(",")
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean);
    if (!["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        !allowed.includes(url.host.toLowerCase()) ||
        (env_config_1.config.NODE_ENV === "production" && url.protocol !== "https:"))
        throw new Error("Recording media host is not allowed");
}
async function prepareMeetingAudio(source, directory, signal) {
    assertMediaUrl(source.url);
    const disk = await (0, promises_1.statfs)(directory, { bigint: true });
    const required = BigInt(source.sizeBytes) +
        BigInt(env_config_1.config.MEETING_SUMMARY_MAX_SECONDS * 32000) +
        64n * 1024n * 1024n;
    if (disk.bavail * disk.bsize < required)
        throw new Error("Insufficient temporary storage");
    const local = (0, node_path_1.join)(directory, "recording.mp4");
    const response = await fetch(source.url, {
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(300000)]),
    });
    if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error("Recording download failed");
    }
    const length = response.headers.get("content-length");
    if (length && Number(length) !== source.sizeBytes) {
        await response.body.cancel();
        throw new Error("Recording size changed");
    }
    let bytes = 0;
    const limit = new node_stream_1.Transform({
        transform(chunk, _encoding, callback) {
            bytes += chunk.length;
            callback(bytes > source.sizeBytes || bytes > env_config_1.config.MEETING_SUMMARY_MAX_BYTES
                ? new Error("Recording size exceeded")
                : null, chunk);
        },
    });
    await (0, promises_2.pipeline)(node_stream_1.Readable.fromWeb(response.body), limit, (0, node_fs_1.createWriteStream)(local, { flags: "wx" }), { signal });
    if (bytes !== source.sizeBytes)
        throw new Error("Recording download incomplete");
    await runFfmpeg([
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-i",
        local,
        "-map",
        "0:a:0",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        "-threads",
        "1",
        "-t",
        String(env_config_1.config.MEETING_SUMMARY_MAX_SECONDS + 1),
        "-f",
        "segment",
        "-segment_time",
        String(exports.AUDIO_CHUNK_SECONDS),
        "-reset_timestamps",
        "1",
        (0, node_path_1.join)(directory, "audio-%05d.wav"),
    ], signal);
    const files = (await (0, promises_1.readdir)(directory))
        .filter((name) => /^audio-\d{5}\.wav$/.test(name))
        .sort();
    if (!files.length ||
        files.length >
            Math.ceil(env_config_1.config.MEETING_SUMMARY_MAX_SECONDS / exports.AUDIO_CHUNK_SECONDS))
        throw new Error("Recording audio duration is invalid");
    return files.map((name) => (0, node_path_1.join)(directory, name));
}
function runFfmpeg(args, signal) {
    return new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)(env_config_1.config.MEETING_FFMPEG_PATH, args, {
            windowsHide: true,
            stdio: ["ignore", "ignore", "ignore"],
            signal: AbortSignal.any([signal, AbortSignal.timeout(300000)]),
            killSignal: "SIGKILL",
        });
        child.once("error", () => reject(new Error("FFmpeg unavailable or interrupted")));
        child.once("close", (code) => code === 0
            ? resolve()
            : reject(new Error("FFmpeg could not extract audio")));
    });
}
