import { api } from "@/lib/axios";
import {
  ApiResponse,
  SpaceResponse,
  SpaceSettingResponse,
  SpaceMembersListResponse,
  SpaceInvitation,
  AcceptSpaceInvitationResponse,
  ChannelResponse,
  ConversationMember,
  UserSearchResponse,
} from "../types/chat.types";
import { SpaceRole } from "../types/chat.enums";
import { normalizeApiResponse } from "./chat.api";
import {
  normalizeSpace,
  normalizeSpaceSetting,
} from "../utils/space-setting-utils";

// ─── Space CRUD ────────────────────────────────────────────────────────────

export const createSpace = async (
  name: string,
): Promise<ApiResponse<SpaceResponse>> => {
  const response = await api.post("/api/spaces", { name });
  const payload = normalizeApiResponse<SpaceResponse>(response.data);
  return {
    ...payload,
    data: normalizeSpace(payload.data),
  };
};

export const getUserSpaces = async (): Promise<
  ApiResponse<SpaceResponse[]>
> => {
  const response = await api.get("/api/spaces");
  const payload = response.data;
  const spaces = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(spaces) ? spaces.map(normalizeSpace) : [],
  };
};

export const getSpaceDetails = async (
  spaceId: string,
): Promise<ApiResponse<SpaceResponse>> => {
  const response = await api.get(`/api/spaces/${spaceId}`);
  const payload = normalizeApiResponse<SpaceResponse>(response.data);
  return {
    ...payload,
    data: normalizeSpace(payload.data),
  };
};

export const updateSpace = async (
  spaceId: string,
  name: string,
): Promise<ApiResponse<SpaceResponse>> => {
  const response = await api.patch(`/api/spaces/${spaceId}`, { name });
  const payload = normalizeApiResponse<SpaceResponse>(response.data);
  return {
    ...payload,
    data: normalizeSpace(payload.data),
  };
};

export const deleteSpace = async (
  spaceId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/spaces/${spaceId}`);
  return normalizeApiResponse<unknown>(response.data);
};

export const leaveSpace = async (
  spaceId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(`/api/spaces/${spaceId}/leave`);
  return normalizeApiResponse<unknown>(response.data);
};

// ─── Space Settings ────────────────────────────────────────────────────────

export const updateSpaceSettings = async (
  spaceId: string,
  settings: Partial<SpaceSettingResponse>,
): Promise<ApiResponse<SpaceSettingResponse>> => {
  const response = await api.patch(`/api/spaces/${spaceId}/settings`, settings);
  const payload = normalizeApiResponse<SpaceSettingResponse>(response.data);
  return {
    ...payload,
    data: normalizeSpaceSetting(payload.data, spaceId),
  };
};

// ─── Space Members ─────────────────────────────────────────────────────────

export const getSpaceMembers = async (
  spaceId: string,
  search?: string,
  limit?: number,
): Promise<ApiResponse<SpaceMembersListResponse>> => {
  const response = await api.get(`/api/spaces/${spaceId}/members`, {
    params: { search: search || undefined, limit },
  });
  return normalizeApiResponse<SpaceMembersListResponse>(response.data);
};

export const updateSpaceMemberRole = async (
  spaceId: string,
  memberId: string,
  role: SpaceRole,
): Promise<ApiResponse<ConversationMember>> => {
  if (![SpaceRole.ADMIN, SpaceRole.MEMBER].includes(role)) {
    throw new Error("Invalid space member role");
  }
  const response = await api.patch(
    `/api/spaces/${spaceId}/members/${memberId}/role`,
    { role },
  );
  return normalizeApiResponse<ConversationMember>(response.data);
};

export const transferSpaceOwnership = async (
  spaceId: string,
  targetUserId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.patch(
    `/api/spaces/${spaceId}/transfer-ownership`,
    { targetUserId },
  );
  return normalizeApiResponse<unknown>(response.data);
};

export const removeSpaceMember = async (
  spaceId: string,
  memberId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(
    `/api/spaces/${spaceId}/members/${memberId}`,
  );
  return normalizeApiResponse<unknown>(response.data);
};

// ─── Space Channels ────────────────────────────────────────────────────────

export const createChannel = async (
  spaceId: string,
  name: string,
): Promise<ApiResponse<ChannelResponse>> => {
  const response = await api.post(`/api/spaces/${spaceId}/channels`, { name });
  return normalizeApiResponse<ChannelResponse>(response.data);
};

export const getSpaceChannels = async (
  spaceId: string,
  search?: string,
): Promise<ApiResponse<ChannelResponse[]>> => {
  const response = await api.get(`/api/spaces/${spaceId}/channels`, {
    params: { search: search || undefined },
  });
  const payload = response.data;
  const channels = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(channels) ? channels : [],
  };
};

// ─── Space Invitations ─────────────────────────────────────────────────────

export const inviteSpaceMembers = async (
  spaceId: string,
  invitees: Pick<UserSearchResponse, "id" | "fullName" | "avatarUrl">[],
): Promise<ApiResponse<SpaceInvitation[]>> => {
  const response = await api.post(`/api/spaces/${spaceId}/invite`, {
    invitees: invitees.map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    })),
  });
  return normalizeApiResponse<SpaceInvitation[]>(response.data);
};

export const getSpaceInvitations = async (
  spaceId: string,
): Promise<ApiResponse<SpaceInvitation[]>> => {
  const response = await api.get(`/api/spaces/${spaceId}/invitations`);
  return normalizeApiResponse<SpaceInvitation[]>(response.data);
};

export const cancelSpaceInvitation = async (
  spaceId: string,
  invitationId: string,
): Promise<ApiResponse<unknown>> => {
  const response = await api.delete(
    `/api/spaces/${spaceId}/invitations/${invitationId}`,
  );
  return normalizeApiResponse<unknown>(response.data);
};

export const resendSpaceInvitation = async (
  spaceId: string,
  invitationId: string,
): Promise<ApiResponse<SpaceInvitation>> => {
  const response = await api.post(
    `/api/spaces/${spaceId}/invitations/${invitationId}/resend`,
  );
  return normalizeApiResponse<SpaceInvitation>(response.data);
};

// ─── Pending Invitations (user-level) ────────────────────────────────────

export const getPendingInvitations = async (): Promise<
  ApiResponse<SpaceInvitation[]>
> => {
  const response = await api.get("/api/invitations/pending");
  return normalizeApiResponse<SpaceInvitation[]>(response.data);
};

export const acceptInvitation = async (
  invitationId: string,
): Promise<ApiResponse<AcceptSpaceInvitationResponse>> => {
  const response = await api.post(`/api/invitations/${invitationId}/accept`);
  return normalizeApiResponse<AcceptSpaceInvitationResponse>(response.data);
};

export const declineInvitation = async (
  invitationId: string,
): Promise<ApiResponse<SpaceInvitation>> => {
  const response = await api.post(`/api/invitations/${invitationId}/decline`);
  return normalizeApiResponse<SpaceInvitation>(response.data);
};
