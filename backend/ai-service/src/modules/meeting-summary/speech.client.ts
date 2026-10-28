import { readFile } from "node:fs/promises";
import { z } from "zod";
import { config } from "../../config/env.config";

export class SpeechRecognitionError extends Error {
  constructor(readonly status: number) {
    super(`Local speech worker HTTP ${status}`);
  }
}
const speechResponse = z.object({ text: z.string().max(12000) }).strict();

export async function recognizeMeetingChunk(path: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const audio = await readFile(path);
  if (!audio.length || audio.length > 2 * 1024 * 1024)
    throw new Error("Audio chunk is too large or empty");
  const response = await fetch(
    config.MEETING_STT_URL.replace(/\/$/, "") + "/transcribe",
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(config.MEETING_STT_TIMEOUT_MS),
      ]),
      headers: {
        "x-internal-service-key": config.MEETING_STT_SERVICE_KEY,
        "content-type": "audio/wav",
      },
      body: audio,
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new SpeechRecognitionError(response.status);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty local speech response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 65536) throw new Error("Local speech response exceeds limit");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return speechResponse
    .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")))
    .text.trim();
}
