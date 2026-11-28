import { z } from "zod";
import { config } from "../../config/env.config";
import {
  internalPost,
  serviceUrl,
} from "../../infrastructure/integrations/internal-http";

export const sourceSchema = z.object({
  recordingId: z.uuid(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  url: z.url(),
  sizeBytes: z.number().int().positive(),
  durationSeconds: z.number().positive(),
});
export type MeetingSource = z.infer<typeof sourceSchema>;

export async function meetingSource(
  id: string,
  actorId: string,
  signal: AbortSignal,
) {
  const response = await internalPost(
    serviceUrl(
      config.COMMUNICATION_SERVICE_URL,
      `/internal/meeting-summaries/${id}/source`,
    ),
    {
      key: config.AI_TO_COMMUNICATION_KEY,
      body: { actorId },
      signal,
      timeoutMs: 15000,
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Recording access unavailable");
  }
  const payload = (await response.json()) as { data: unknown };
  const source = sourceSchema.parse(payload.data);
  if (
    source.recordingId !== id ||
    source.sizeBytes > config.MEETING_SUMMARY_MAX_BYTES ||
    source.durationSeconds > config.MEETING_SUMMARY_MAX_SECONDS
  )
    throw new Error("Recording exceeds summary limits");

  return source;
}
