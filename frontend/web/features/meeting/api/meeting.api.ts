import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import { MEETING_API_PATHS } from "../types/meeting.constants";
import type {
  CreateInstantMeetingPayload,
  InstantMeetingResponse,
  JoinMeetingPayload,
  MeetingAccessResponse,
} from "../types/meeting.types";
import type { ApiResponse } from "@/features/chat/types/chat.types";

export const createInstantMeeting = async (
  payload: CreateInstantMeetingPayload,
): Promise<ApiResponse<InstantMeetingResponse>> => {
  const response = await api.post(MEETING_API_PATHS.INSTANT, payload);
  return normalizeApiResponse<InstantMeetingResponse>(response.data);
};

export const joinMeeting = async (
  joinToken: string,
  payload: JoinMeetingPayload,
): Promise<ApiResponse<InstantMeetingResponse>> => {
  const response = await api.post(MEETING_API_PATHS.join(joinToken), payload);
  return normalizeApiResponse<InstantMeetingResponse>(response.data);
};

export const getMeetingAccess = async (
  joinToken: string,
): Promise<ApiResponse<MeetingAccessResponse>> => {
  const response = await api.get(MEETING_API_PATHS.access(joinToken));
  return normalizeApiResponse<MeetingAccessResponse>(response.data);
};
