import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import type {
  CreateInstantMeetingPayload,
  InstantMeetingResponse,
  JoinMeetingPayload,
} from "../types/meeting.types";
import type { ApiResponse } from "@/features/chat/types/chat.types";

export const createInstantMeeting = async (
  payload: CreateInstantMeetingPayload,
): Promise<ApiResponse<InstantMeetingResponse>> => {
  const response = await api.post("/api/meetings/instant", payload);
  return normalizeApiResponse<InstantMeetingResponse>(response.data);
};

export const joinMeeting = async (
  joinToken: string,
  payload: JoinMeetingPayload,
): Promise<ApiResponse<InstantMeetingResponse>> => {
  const response = await api.post(`/api/meetings/${joinToken}/join`, payload);
  return normalizeApiResponse<InstantMeetingResponse>(response.data);
};
