import { readFile } from "node:fs/promises";
import { z } from "zod";
import { config } from "../../config/env.config";
import { readResponseText } from "../../common/read-response";

export class SpeechRecognitionError extends Error {
  constructor(readonly status: number) {
    super(`Local speech worker HTTP ${status}`);
  }
}
const speechResponse = z.object({ text: z.string().max(12000) }).strict();

export async function recognizeSpeechChunk(
  path: string,
  signal: AbortSignal,
  language: "vi" | "en" | "auto" = "vi",
) {
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
        "x-speech-language": language,
      },
      body: audio,
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new SpeechRecognitionError(response.status);
  }

  const text = await readResponseText(
    response,
    65536,
    new Error("Local speech response exceeds limit"),
  );

  return speechResponse.parse(JSON.parse(text)).text.trim();
}
