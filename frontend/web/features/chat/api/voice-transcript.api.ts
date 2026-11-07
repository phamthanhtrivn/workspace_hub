import { api } from "@/lib/axios";
import type { VoiceChatType, VoiceTranscript } from "../types/voice.types";

const transcriptPath = (mediaId: string) =>
  `/api/medias/${encodeURIComponent(mediaId)}/transcript`;
export async function getVoiceTranscript(
  mediaId: string,
  chatType: VoiceChatType,
  signal?: AbortSignal,
): Promise<VoiceTranscript> {
  const response = await api.get<{ data: VoiceTranscript }>(
    transcriptPath(mediaId),
    { params: { chatType }, signal },
  );
  return response.data.data;
}
export async function createVoiceTranscript(
  mediaId: string,
  chatType: VoiceChatType,
): Promise<VoiceTranscript> {
  const response = await api.post<{ data: VoiceTranscript }>(
    transcriptPath(mediaId),
    undefined,
    { params: { chatType } },
  );
  return response.data.data;
}
