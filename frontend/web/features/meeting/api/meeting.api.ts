import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import { MEETING_API_PATHS } from "../types/meeting.constants";
import type {
  CreateInstantMeetingPayload,
  InstantMeetingResponse,
  JoinMeetingPayload,
  MeetingJoinRequestsResponse,
  MeetingJoinRequestStatusResponse,
  MeetingSettingsResponse,
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

export const updateMeetingSettings = async (
  joinToken: string,
  payload: { autoAdmit: boolean },
): Promise<ApiResponse<MeetingSettingsResponse>> => {
  const response = await api.patch(MEETING_API_PATHS.settings(joinToken), payload);
  return normalizeApiResponse<MeetingSettingsResponse>(response.data);
};

export const requestMeetingJoinApproval = async (
  joinToken: string,
): Promise<ApiResponse<MeetingJoinRequestStatusResponse>> => {
  const response = await api.post(MEETING_API_PATHS.joinRequests(joinToken));
  return normalizeApiResponse<MeetingJoinRequestStatusResponse>(response.data);
};

export const getMeetingJoinRequests = async ({
  joinToken,
  search,
  page,
  limit,
}: {
  joinToken: string;
  search: string;
  page: number;
  limit: number;
}): Promise<ApiResponse<MeetingJoinRequestsResponse>> => {
  const response = await api.get(MEETING_API_PATHS.joinRequests(joinToken), {
    params: { search, page, limit },
  });
  return normalizeApiResponse<MeetingJoinRequestsResponse>(response.data);
};

export const approveMeetingJoinRequest = async (
  joinToken: string,
  userId: string,
): Promise<ApiResponse<MeetingJoinRequestStatusResponse>> => {
  const response = await api.post(
    MEETING_API_PATHS.approveJoinRequest(joinToken, userId),
  );
  return normalizeApiResponse<MeetingJoinRequestStatusResponse>(response.data);
};

export const declineMeetingJoinRequest = async (
  joinToken: string,
  userId: string,
): Promise<ApiResponse<MeetingJoinRequestStatusResponse>> => {
  const response = await api.post(
    MEETING_API_PATHS.declineJoinRequest(joinToken, userId),
  );
  return normalizeApiResponse<MeetingJoinRequestStatusResponse>(response.data);
};

export const approveAllMeetingJoinRequests = async (
  joinToken: string,
): Promise<ApiResponse<{ count: number }>> => {
  const response = await api.post(MEETING_API_PATHS.approveAllJoinRequests(joinToken));
  return normalizeApiResponse<{ count: number }>(response.data);
};

export const declineAllMeetingJoinRequests = async (
  joinToken: string,
): Promise<ApiResponse<{ count: number }>> => {
  const response = await api.post(MEETING_API_PATHS.declineAllJoinRequests(joinToken));
  return normalizeApiResponse<{ count: number }>(response.data);
};
