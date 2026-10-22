import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import type { CaptionSession } from "../types/meeting-captions.types";
const path = (token: string) =>
  `/api/meetings/${encodeURIComponent(token)}/captions`;
export const captionsApi = {
  status: async (token: string) =>
    normalizeApiResponse<{ available: boolean; language: string }>(
      (await api.get(path(token))).data,
    ).data,
  start: async (token: string) =>
    normalizeApiResponse<CaptionSession>((await api.post(path(token))).data)
      .data,
  release: async (token: string) => api.delete(path(token)),
};
