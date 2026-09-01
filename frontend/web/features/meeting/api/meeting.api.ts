import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import type {
  CreateInstantMeetingPayload,
  InstantMeetingResponse,
} from "../types/meeting.types";
import type { ApiResponse } from "@/features/chat/types/chat.types";

export const createInstantMeeting = async (
  payload: CreateInstantMeetingPayload,
): Promise<ApiResponse<InstantMeetingResponse>> => {
  const response = await api.post("/api/meetings/instant", payload);
  return normalizeApiResponse<InstantMeetingResponse>(response.data);
};
