export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
export const NO_AVATAR_TYPES = ["POLL", "NOTE", "TASK", "SYSTEM", "EVENT"];

export interface UserSearchResponse {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface UserProfileResponse {
  id?: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  dob: string | null;
  bio: string | null;
}

export type ConversationType = "DIRECT" | "GROUP";
export type ConversationRole = "OWNER" | "ADMIN" | "MEMBER";

export interface ConversationSetting {
  id: string;
  allowSendMessage: boolean;
  allowCreatePoll: boolean;
  allowCreateNote: boolean;
  allowPinMessage: boolean;
}

export interface ConversationMember {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadMessageId: string | null;
  muted: boolean;
  pinned?: boolean;
  nickname: string | null;
  role: ConversationRole;
}

export interface ConversationResponse {
  id: string;
  type: ConversationType;
  spaceId?: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  setting?: ConversationSetting | null;
  members: ConversationMember[];
  messages?: any[];
}

export interface ChatMediaResponse {
  id: string;
  name: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  type?: string;
  createdAt?: string;
  message?: {
    id: string;
    senderId: string;
    createdAt: string;
    channelId?: string;
    conversationId?: string;
  };
}

export interface ChatMessageResponse {
  id: string;
  senderId: string;
  channelId?: string | null;
  conversationId?: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt?: string;
  threadParentId?: string | null;
  threadReplyCount?: number;
  threadLastReplyAt?: string | null;
  medias?: ChatMediaResponse[];
  [key: string]: unknown;
}

export interface PaginatedMessagesResponse {
  messages: ChatMessageResponse[];
  nextCursor?: string;
  prevCursor?: string;
}

export interface PaginatedMediaResponse {
  medias: ChatMediaResponse[];
  nextCursor?: string;
}

export interface PinnedMessagesResponse {
  messages: ChatMessageResponse[];
  nextCursor?: string;
}

export interface ThreadMessagesResponse {
  rootMessage?: ChatMessageResponse;
  replies: ChatMessageResponse[];
}

export interface MuteConversationResponse {
  muted: boolean;
  [key: string]: unknown;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface GroupInvitation {
  id: string;
  spaceId: string;
  invitedUserId: string;
  invitedBy: string;
  invitedByName?: string;
  invitedByAvatar?: string;
  invitedUserName?: string ;
  invitedUserAvatar?: string;
  inviter?: {
    userId: string;
    fullName: string;
    avatarUrl: string;
  };
  invitee?: {
    userId: string;
    fullName: string;
    avatarUrl: string;
  };
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string;
  space?: any;
}

export type ChatProfilesMap = Record<string, UserProfileResponse>;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
