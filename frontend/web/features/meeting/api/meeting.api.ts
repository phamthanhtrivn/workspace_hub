import { api } from "@/lib/axios";
import { normalizeApiResponse } from "@/features/chat/api/chat.api";
import { MEETING_API_PATHS } from "../types/meeting.constants";
import type {
  CreateInstantMeetingPayload,
  InstantMeetingResponse,
  JoinMeetingPayload,
  MeetingEndedResponse,
  MeetingJoinRequestsResponse,
  MeetingJoinRequestStatusResponse,
  MeetingMessageReactionPayload,
  MeetingMessageReactionResult,
  MeetingMessageReadReceiptResponse,
  MeetingMessageResponse,
  MeetingMessagesResponse,
  MeetingChatNotificationPreferenceResponse,
  MeetingUnreadMessageCountResponse,
  MeetingParticipantResponse,
  MeetingParticipantRole,
  MeetingParticipantViewPreferencesResponse,
  MeetingParticipantsResponse,
  MeetingSettingsResponse,
  MeetingAccessResponse,
  CreateMeetingMessagePayload,
  EditMeetingMessagePayload,
  UpdateMeetingParticipantViewPreferencePayload,
} from "../types/meeting.types";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import { ChatContextType } from "@/features/chat/types/chat.enums";

export interface MeetingPresignRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface MeetingPresignResponse extends MeetingPresignRequest {
  s3Key: string;
  presignedUrl: string;
}

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

export const getMeetingParticipants = async ({
  joinToken,
  search,
  page,
  limit,
}: {
  joinToken: string;
  search: string;
  page: number;
  limit: number;
}): Promise<ApiResponse<MeetingParticipantsResponse>> => {
  const response = await api.get(MEETING_API_PATHS.participants(joinToken), {
    params: { search, page, limit },
  });
  return normalizeApiResponse<MeetingParticipantsResponse>(response.data);
};

export const getMeetingMessages = async ({
  joinToken,
  cursor,
  limit,
  direction,
}: {
  joinToken: string;
  cursor?: string;
  limit?: number;
  direction?: "older" | "newer" | "around";
}): Promise<ApiResponse<MeetingMessagesResponse>> => {
  const response = await api.get(MEETING_API_PATHS.messages(joinToken), {
    params: { cursor, limit, direction },
  });
  return normalizeApiResponse<MeetingMessagesResponse>(response.data);
};

export const getMeetingUnreadMessageCount = async (
  joinToken: string,
): Promise<ApiResponse<MeetingUnreadMessageCountResponse>> => {
  const response = await api.get(MEETING_API_PATHS.messageUnreadCount(joinToken));
  return normalizeApiResponse<MeetingUnreadMessageCountResponse>(response.data);
};

export const getMeetingMediaPresignedUrls = async ({
  meetingId,
  files,
}: {
  meetingId: string;
  files: MeetingPresignRequest[];
}): Promise<MeetingPresignResponse[]> => {
  const response = await api.post("/api/medias/presign", {
    chatId: meetingId,
    chatType: ChatContextType.MEETING,
    files,
  });
  return normalizeApiResponse<MeetingPresignResponse[]>(response.data).data;
};

export const uploadMeetingMediaToS3 = async (
  file: File,
  presignedUrl: string,
): Promise<boolean> => {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  return response.ok;
};

export const sendMeetingMessage = async (
  joinToken: string,
  payload: CreateMeetingMessagePayload,
): Promise<ApiResponse<MeetingMessageResponse>> => {
  const response = await api.post(MEETING_API_PATHS.messages(joinToken), payload);
  return normalizeApiResponse<MeetingMessageResponse>(response.data);
};

export const editMeetingMessage = async (
  joinToken: string,
  messageId: string,
  payload: EditMeetingMessagePayload,
): Promise<ApiResponse<MeetingMessageResponse>> => {
  const response = await api.patch(
    MEETING_API_PATHS.message(joinToken, messageId),
    payload,
  );
  return normalizeApiResponse<MeetingMessageResponse>(response.data);
};

export const recallMeetingMessage = async (
  joinToken: string,
  messageId: string,
): Promise<ApiResponse<MeetingMessageResponse>> => {
  const response = await api.patch(
    MEETING_API_PATHS.messageRecall(joinToken, messageId),
  );
  return normalizeApiResponse<MeetingMessageResponse>(response.data);
};

export const reactMeetingMessage = async (
  joinToken: string,
  messageId: string,
  payload: MeetingMessageReactionPayload,
): Promise<ApiResponse<MeetingMessageReactionResult>> => {
  const response = await api.post(
    MEETING_API_PATHS.messageReactions(joinToken, messageId),
    payload,
  );
  return normalizeApiResponse<MeetingMessageReactionResult>(response.data);
};

export const removeMeetingMessageReaction = async (
  joinToken: string,
  messageId: string,
  payload: MeetingMessageReactionPayload,
): Promise<ApiResponse<MeetingMessageReactionResult>> => {
  const response = await api.delete(
    MEETING_API_PATHS.messageReactions(joinToken, messageId),
    { data: payload },
  );
  return normalizeApiResponse<MeetingMessageReactionResult>(response.data);
};

export const markMeetingMessageAsRead = async (
  joinToken: string,
  messageId: string,
): Promise<ApiResponse<MeetingMessageReadReceiptResponse>> => {
  const response = await api.post(MEETING_API_PATHS.messageRead(joinToken), {
    messageId,
  });
  return normalizeApiResponse<MeetingMessageReadReceiptResponse>(response.data);
};

export const updateMeetingChatNotificationPreference = async (
  joinToken: string,
  payload: { chatMuted: boolean },
): Promise<ApiResponse<MeetingChatNotificationPreferenceResponse>> => {
  const response = await api.patch(
    MEETING_API_PATHS.chatNotifications(joinToken),
    payload,
  );
  return normalizeApiResponse<MeetingChatNotificationPreferenceResponse>(
    response.data,
  );
};

export const getMeetingParticipantViewPreferences = async (
  joinToken: string,
): Promise<ApiResponse<MeetingParticipantViewPreferencesResponse>> => {
  const response = await api.get(
    MEETING_API_PATHS.participantViewPreferences(joinToken),
  );
  return normalizeApiResponse<MeetingParticipantViewPreferencesResponse>(
    response.data,
  );
};

export const updateMeetingParticipantViewPreference = async (
  joinToken: string,
  userId: string,
  payload: UpdateMeetingParticipantViewPreferencePayload,
): Promise<ApiResponse<MeetingParticipantViewPreferencesResponse>> => {
  const response = await api.patch(
    MEETING_API_PATHS.updateParticipantViewPreference(joinToken, userId),
    payload,
  );
  return normalizeApiResponse<MeetingParticipantViewPreferencesResponse>(
    response.data,
  );
};

export const leaveMeeting = async (
  joinToken: string,
): Promise<ApiResponse<MeetingParticipantResponse>> => {
  const response = await api.post(MEETING_API_PATHS.leave(joinToken));
  return normalizeApiResponse<MeetingParticipantResponse>(response.data);
};

export const endMeeting = async (
  joinToken: string,
): Promise<ApiResponse<MeetingEndedResponse>> => {
  const response = await api.post(MEETING_API_PATHS.end(joinToken));
  return normalizeApiResponse<MeetingEndedResponse>(response.data);
};

export const removeMeetingParticipant = async (
  joinToken: string,
  userId: string,
): Promise<ApiResponse<MeetingParticipantResponse>> => {
  const response = await api.post(
    MEETING_API_PATHS.removeParticipant(joinToken, userId),
  );
  return normalizeApiResponse<MeetingParticipantResponse>(response.data);
};

export const updateMeetingParticipantRole = async (
  joinToken: string,
  userId: string,
  role: MeetingParticipantRole,
): Promise<ApiResponse<MeetingParticipantResponse>> => {
  const response = await api.patch(
    MEETING_API_PATHS.updateParticipantRole(joinToken, userId),
    { role },
  );
  return normalizeApiResponse<MeetingParticipantResponse>(response.data);
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
