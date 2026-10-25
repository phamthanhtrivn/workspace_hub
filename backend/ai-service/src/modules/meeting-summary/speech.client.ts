import { GoogleAuth } from "google-auth-library";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { config } from "../../config/env.config";

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
export class SpeechRecognitionError extends Error {
  constructor(readonly status: number) {
    super(`Speech provider HTTP ${status}`);
  }
}
const speechResponse = z.object({
  results: z
    .array(
      z.object({
        alternatives: z
          .array(z.object({ transcript: z.string().max(12000) }))
          .optional(),
      }),
    )
    .max(500)
    .optional(),
});

export async function recognizeMeetingChunk(path: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const audio = await readFile(path);
  if (audio.length > 2 * 1024 * 1024)
    throw new Error("Audio chunk is too large");
  const token = await auth.getAccessToken();
  signal.throwIfAborted();
  if (!token) throw new Error("Google Speech authentication unavailable");
  const location = config.GOOGLE_STT_LOCATION;
  const project = encodeURIComponent(config.GOOGLE_CLOUD_PROJECT);
  const response = await fetch(
    `https://${location}-speech.googleapis.com/v2/projects/${project}/locations/${location}/recognizers/_:recognize`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        config: {
          autoDecodingConfig: {},
          languageCodes: ["vi-VN"],
          model: "chirp_3",
        },
        content: audio.toString("base64"),
      }),
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new SpeechRecognitionError(response.status);
  }
  const result = speechResponse.parse(await response.json());
  const text = (result.results || [])
    .map((item) => item.alternatives?.[0]?.transcript || "")
    .join(" ")
    .trim();
  if (text.length > 12000) throw new Error("Speech response is too large");
  return text;
}
