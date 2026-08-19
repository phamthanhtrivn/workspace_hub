/**
 * chat.api.ts — Shared utilities + barrel re-export
 *
 * File này giữ lại:
 *   1. Các shared utility functions (normalizeApiResponse, normalizeDirectConversation)
 *      vì cả channel.api.ts và direct-message.api.ts đều dùng.
 *   2. Các API không thuộc về domain channel hoặc DM cụ thể:
 *      searchUserByEmail, getUserConversations, getPublicProfile
 *   3. Re-export tất cả từ các file domain để backward compatible với các
 *      import cũ: `import { getSpaceDetails } from "../api/chat.api"`
 */

import { api } from "@/lib/axios";
import {
  ApiResponse,
  ConversationResponse,
  DirectConversationResponse,
  ConversationMember,
  ConversationSetting,
  UserSearchResponse,
  UserProfileResponse,
  ChannelResponse,
} from "../types/chat.types";
import {
  normalizeSpace,
  normalizeSpaceSetting,
} from "../utils/space-setting-utils";

// ─── Internal types ────────────────────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

type RawDirectConversation = Partial<DirectConversationResponse> &
  UnknownRecord & {
    participants?: ConversationMember[];
    members?: ConversationMember[];
    setting?: ConversationSetting | null;
  };

// ─── Shared helpers (exported for domain files) ────────────────────────────

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function normalizeApiResponse<T>(payload: unknown): ApiResponse<T> {
  const responsePayload = isRecord(payload) ? payload : {};
  const data = isRecord(payload) && "data" in payload ? payload.data : payload;
  return {
    ...responsePayload,
    success:
      typeof responsePayload.success === "boolean"
        ? responsePayload.success
        : true,
    data: data as T,
  };
}

export function normalizeDirectConversation(
  conversation: RawDirectConversation,
): DirectConversationResponse {
  if (!conversation) return conversation;

  const members = conversation.members || conversation.participants || [];

  return {
    ...conversation,
    members: members.map((member) => ({
      ...member,
      role: member.role || "MEMBER",
    })),
    setting: conversation.setting || {
      allowSendMessage: true,
      allowCreateNote: true,
      allowCreatePoll: true,
      allowPinMessage: true,
    },
  } as DirectConversationResponse;
}

// ─── Shared / cross-domain APIs ────────────────────────────────────────────

export const searchUserByEmail = async (
  email: string,
): Promise<ApiResponse<UserSearchResponse[]>> => {
  const response = await api.get("/api/users/search", {
    params: { email },
  });
  const payload = normalizeApiResponse<
    UserSearchResponse[] | UserSearchResponse
  >(response.data);
  return {
    ...payload,
    data: Array.isArray(payload.data) ? payload.data : [payload.data],
  };
};

export const getUserConversations = async (): Promise<
  ApiResponse<ConversationResponse[]>
> => {
  const response = await api.get("/api/channels");
  const payload = response.data;
  const conversations = payload?.data ?? payload;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: Array.isArray(conversations)
      ? conversations.map((conversation: RawDirectConversation) =>
          conversation.participants
            ? normalizeDirectConversation(conversation)
            : (conversation as unknown as ChannelResponse),
        )
      : [],
  };
};

export const getPublicProfile = async (
  id: string,
): Promise<ApiResponse<UserProfileResponse>> => {
  const response = await api.get(`/api/users/${id}/profile`);
  const payload = response.data;
  return {
    ...payload,
    success: payload?.success ?? true,
    data: payload?.data ?? payload,
  };
};

// ─── Re-exports — backward compatibility ──────────────────────────────────
// Cho phép các file cũ vẫn import từ chat.api mà không cần sửa

export {
  // Space APIs
  createSpace,
  getUserSpaces,
  getSpaceDetails,
  updateSpace,
  deleteSpace,
  leaveSpace,
  updateSpaceSettings,
  getSpaceMembers,
  updateSpaceMemberRole,
  transferSpaceOwnership,
  removeSpaceMember,
  createChannel,
  getSpaceChannels,
  inviteSpaceMembers,
  getSpaceInvitations,
  cancelSpaceInvitation,
  resendSpaceInvitation,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from "./space.api";

export {
  // Channel APIs
  getChannelMembers,
  inviteMembers,
  updateMemberRole,
  kickMember,
  leaveChannel,
  disbandChannel,
  joinChannel,
  updateChannelInfo,
  updateChannelSettings,
  getChannelAvatarPresignedUrl,
  muteChannel,
  pinChannel,
  getChannelMessages,
  searchChannelMessages,
  getChannelMedia,
  getPinnedMessages,
  getChannelThreads,
  getFollowedChannelThreads,
  markChannelThreadAsRead,
  getThreadMessages,
  followThread,
  unfollowThread,
} from "./channel.api";

export {
  // Direct Message APIs
  createDirectConversation,
  getDirectConversations,
  sendDirectMessage,
  getDirectConversationMessages,
  markDirectConversationAsRead,
  editDirectMessage,
  recallDirectMessage,
  deleteDirectMessage,
  searchDirectConversationMessages,
  addDirectReaction,
  removeDirectReaction,
  pinDirectMessage,
  unpinDirectMessage,
  getDirectConversationMedia,
  getDirectPinnedMessages,
  muteDirectConversation,
  pinDirectConversation,
  getDirectConversationThreads,
  getDirectThreadMessages,
  markDirectThreadAsRead,
  followDirectThread,
  unfollowDirectThread,
  getFollowedDirectThreads,
} from "./direct-message.api";

// Re-export normalizers for backward compat
export { normalizeSpace, normalizeSpaceSetting };
