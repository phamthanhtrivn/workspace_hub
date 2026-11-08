import { z } from "zod";
import { config } from "../../config/env.config";
import { readResponseText } from "../../common/read-response";
import { VOICE_TRANSCRIPT, type VoiceChatType } from "./voice.constants";

const schema = z.object({
  mediaId: z.uuid(),
  chatType: z.enum(["CHANNEL", "DIRECT_MESSAGE"]),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  url: z.url(),
  sizeBytes: z.number().int().positive().max(VOICE_TRANSCRIPT.maxBytes),
});
export class VoiceSourceError extends Error {
  constructor(readonly status: number) {
    super("Voice message access unavailable");
  }
}
export async function voiceSource(
  mediaId: string,
  actorId: string,
  chatType: VoiceChatType,
  signal: AbortSignal,
) {
  const response = await fetch(
    `${config.COMMUNICATION_SERVICE_URL.replace(/\/$/, "")}/${VOICE_TRANSCRIPT.route}/${mediaId}/source`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      headers: {
        "content-type": "application/json",
        "x-internal-service-key": config.AI_TO_COMMUNICATION_KEY,
      },
      body: JSON.stringify({ actorId, chatType }),
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new VoiceSourceError(response.status);
  }
  const payload = JSON.parse(await readResponseText(response, 65536)) as {
    data?: unknown;
  };
  const source = schema.parse(payload.data);
  if (source.mediaId !== mediaId || source.chatType !== chatType)
    throw new Error("Voice message source mismatch");
  return source;
}
