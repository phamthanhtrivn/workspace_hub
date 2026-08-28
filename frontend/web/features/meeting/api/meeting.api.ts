import { api } from "@/lib/axios";
import {
  MeetingApiRoute,
  meetingApiRoutes,
} from "../types/meeting.constants";
import {
  ApiResponse,
  CreateInstantMeetingRequest,
  MeetingLiveKitTokenResponse,
  MeetingParticipant,
  MeetingResponse,
  RequestJoinMeetingResponse,
  UpdateMeetingAccessRequest,
} from "../types/meeting.types";
import { normalizeMeetingResponse } from "../utils/meeting.utils";

export async function createInstantMeeting(
  payload: CreateInstantMeetingRequest,
): Promise<ApiResponse<MeetingResponse>> {
  const response = await api.post(MeetingApiRoute.INSTANT, payload);
  return normalizeMeetingResponse<MeetingResponse>(response.data);
}

export async function getMeetings(): Promise<ApiResponse<MeetingResponse[]>> {
  const response = await api.get(MeetingApiRoute.ROOT);
  return normalizeMeetingResponse<MeetingResponse[]>(response.data);
}

export async function getMeetingJoinInfo(
  joinToken: string,
): Promise<ApiResponse<MeetingResponse>> {
  const response = await api.get(meetingApiRoutes.joinInfo(joinToken));
  return normalizeMeetingResponse<MeetingResponse>(response.data);
}

export async function requestJoinMeeting(
  meetingId: string,
): Promise<ApiResponse<RequestJoinMeetingResponse>> {
  const response = await api.post(meetingApiRoutes.joinRequests(meetingId));
  return normalizeMeetingResponse<RequestJoinMeetingResponse>(response.data);
}

export async function getMeetingJoinRequests(
  meetingId: string,
): Promise<ApiResponse<MeetingParticipant[]>> {
  const response = await api.get(meetingApiRoutes.joinRequests(meetingId));
  return normalizeMeetingResponse<MeetingParticipant[]>(response.data);
}

export async function approveMeetingJoinRequest(
  meetingId: string,
  userId: string,
): Promise<ApiResponse<MeetingParticipant>> {
  const response = await api.post(
    meetingApiRoutes.approveJoinRequest(meetingId, userId),
  );
  return normalizeMeetingResponse<MeetingParticipant>(response.data);
}

export async function rejectMeetingJoinRequest(
  meetingId: string,
  userId: string,
): Promise<ApiResponse<MeetingParticipant>> {
  const response = await api.post(
    meetingApiRoutes.rejectJoinRequest(meetingId, userId),
  );
  return normalizeMeetingResponse<MeetingParticipant>(response.data);
}

export async function updateMeetingAccess(
  meetingId: string,
  payload: UpdateMeetingAccessRequest,
): Promise<ApiResponse<MeetingResponse>> {
  const response = await api.patch(meetingApiRoutes.access(meetingId), payload);
  return normalizeMeetingResponse<MeetingResponse>(response.data);
}

export async function leaveMeeting(
  meetingId: string,
): Promise<ApiResponse<MeetingParticipant>> {
  const response = await api.post(meetingApiRoutes.leave(meetingId));
  return normalizeMeetingResponse<MeetingParticipant>(response.data);
}

export async function endMeeting(
  meetingId: string,
): Promise<ApiResponse<MeetingResponse>> {
  const response = await api.post(meetingApiRoutes.end(meetingId));
  return normalizeMeetingResponse<MeetingResponse>(response.data);
}

export async function getMeetingLiveKitToken(
  meetingId: string,
): Promise<ApiResponse<MeetingLiveKitTokenResponse>> {
  const response = await api.post(meetingApiRoutes.liveKitToken(meetingId));
  return normalizeMeetingResponse<MeetingLiveKitTokenResponse>(response.data);
}
