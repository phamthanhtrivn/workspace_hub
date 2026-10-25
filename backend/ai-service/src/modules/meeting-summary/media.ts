import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readdir, statfs } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import { config } from "../../config/env.config";
import type { MeetingSource } from "./source";

export const AUDIO_CHUNK_SECONDS = 45;
export function assertMediaUrl(value: string) {
  const url = new URL(value);
  const allowed = config.MEETING_MEDIA_HOSTS.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !allowed.includes(url.host.toLowerCase()) ||
    (config.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw new Error("Recording media host is not allowed");
}
export async function prepareMeetingAudio(
  source: MeetingSource,
  directory: string,
  signal: AbortSignal,
) {
  assertMediaUrl(source.url);
  const disk = await statfs(directory, { bigint: true });
  const required =
    BigInt(source.sizeBytes) +
    BigInt(config.MEETING_SUMMARY_MAX_SECONDS * 32000) +
    64n * 1024n * 1024n;
  if (disk.bavail * disk.bsize < required)
    throw new Error("Insufficient temporary storage");
  const local = join(directory, "recording.mp4");
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
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(
        bytes > source.sizeBytes || bytes > config.MEETING_SUMMARY_MAX_BYTES
          ? new Error("Recording size exceeded")
          : null,
        chunk,
      );
    },
  });
  await pipeline(
    Readable.fromWeb(response.body as never),
    limit,
    createWriteStream(local, { flags: "wx" }),
    { signal },
  );
  if (bytes !== source.sizeBytes)
    throw new Error("Recording download incomplete");
  await runFfmpeg(
    [
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
      String(config.MEETING_SUMMARY_MAX_SECONDS + 1),
      "-f",
      "segment",
      "-segment_time",
      String(AUDIO_CHUNK_SECONDS),
      "-reset_timestamps",
      "1",
      join(directory, "audio-%05d.wav"),
    ],
    signal,
  );
  const files = (await readdir(directory))
    .filter((name) => /^audio-\d{5}\.wav$/.test(name))
    .sort();
  if (
    !files.length ||
    files.length >
      Math.ceil(config.MEETING_SUMMARY_MAX_SECONDS / AUDIO_CHUNK_SECONDS)
  )
    throw new Error("Recording audio duration is invalid");
  return files.map((name) => join(directory, name));
}
export function runFfmpeg(args: string[], signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(config.MEETING_FFMPEG_PATH, args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
      signal: AbortSignal.any([signal, AbortSignal.timeout(300000)]),
      killSignal: "SIGKILL",
    });
    child.once("error", () =>
      reject(new Error("FFmpeg unavailable or interrupted")),
    );
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("FFmpeg could not extract audio")),
    );
  });
}
