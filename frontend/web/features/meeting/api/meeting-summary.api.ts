import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import type { MeetingSummary } from "../types/meeting-summary.types";

const path = (id: string) =>
  `/api/meetings/recordings/${encodeURIComponent(id)}/summary`;
export const meetingSummaryApi = {
  get: async (id: string) =>
    normalizeApiResponse<MeetingSummary>((await api.get(path(id))).data).data,
  start: async (id: string) =>
    normalizeApiResponse<MeetingSummary>((await api.post(path(id))).data).data,
};
