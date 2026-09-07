// Re-export enums từ chat.enums.ts để backward compatible với các import cũ
export {
  ChatContextType,
  SpaceRole,
  MessageType,
  ReactionAction,
  InvitationStatus,
} from "./chat.enums";

// Re-export constants từ chat.constant.ts để backward compatible
export { QUICK_EMOJIS, NO_AVATAR_TYPES } from "./chat.constant";

// ─── User ──────────────────────────────────────────────────────────────────

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

export interface UserProfileSnapshotResponse {
  id?: string | null;
  userId?: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

// ─── Role types ────────────────────────────────────────────────────────────

import { SpaceRole } from "./chat.enums";

/** Role của member trong một channel hoặc direct conversation. */
export type ConversationRole = SpaceRole.ADMIN | SpaceRole.MEMBER;
export type SpaceMemberRole = SpaceRole.ADMIN | SpaceRole.MEMBER;

import { ChatContextType } from "./chat.enums";

export type ChatUiType = ChatContextType.DIRECT_MESSAGE | ChatContextType.CHANNEL;

// ─── Conversation / Channel Settings ──────────────────────────────────────

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
  profile?: UserProfileSnapshotResponse | null;
}

export interface SpaceSettingResponse {
  id?: string | null;
  spaceId?: string | null;
  allowMemberCreateChannel: boolean;
  allowMemberDeleteOwnChannel: boolean;
}

// ─── Channel Members ───────────────────────────────────────────────────────

export interface ChannelMemberListItem extends ConversationMember {
  profile: UserProfileSnapshotResponse | null;
}

export interface ChannelMembersListResponse {
  total: number;
  admins: ChannelMemberListItem[];
  members: ChannelMemberListItem[];
  nextCursor?: string | null;
}

// ─── Space Members ─────────────────────────────────────────────────────────

export interface SpaceMemberListItem {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceMemberRole;
  joinedAt: string;
  profile: UserProfileSnapshotResponse | null;
}

export interface SpaceMembersListResponse {
  total: number;
  admins: SpaceMemberListItem[];
  members: SpaceMemberListItem[];
  nextCursor?: string | null;
}

// ─── Conversation / Channel entities ──────────────────────────────────────

interface ChatListEntityBase {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  setting?: ConversationSetting | null;
  members: ConversationMember[];
  messages?: ChatMessageResponse[];
  unreadCount?: number;
  hasMention?: boolean;
  hasUnreadThread?: boolean;
}

export interface DirectConversationResponse extends ChatListEntityBase {
  participants?: ConversationMember[];
}

export interface ChannelResponse extends ChatListEntityBase {
  spaceId: string;
  isDefault?: boolean;
}

export type ChatEntity = DirectConversationResponse | ChannelResponse;
export type DirectMessage = DirectConversationResponse;
export type SpaceChannel = ChannelResponse;
export type ConversationResponse = ChatEntity;

// ─── Space ─────────────────────────────────────────────────────────────────

export interface SpaceResponse {
  id: string;
  name: string;
  createdBy?: string;
  avatarUrl?: string | null;
  ownerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  defaultChannelId?: string | null;
  memberCount?: number;
  channelCount?: number;
  setting?: SpaceSettingResponse | null;
  creatorProfile?: UserProfileSnapshotResponse | null;
}

// ─── Media ─────────────────────────────────────────────────────────────────

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

// ─── Threads ───────────────────────────────────────────────────────────────

export type ThreadFollowerResponse =
  | string
  | {
      userId: string;
      lastReadAt?: string | null;
    };

// ─── Poll ──────────────────────────────────────────────────────────────────

export interface PollVoteResponse {
  id?: string;
  userId: string;
  pollOptionId?: string;
  createdAt?: string;
  updatedAt?: string;
  voterProfile?: UserProfileSnapshotResponse | null;
}

export interface PollOptionResponse {
  id: string;
  text: string;
  createdBy?: string | null;
  votes?: PollVoteResponse[];
}

export interface PollResponse {
  id: string;
  messageId: string;
  title: string;
  multipleChoice: boolean;
  allowAddOptions: boolean;
  anonymous: boolean;
  isLocked?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  options: PollOptionResponse[];
  creatorProfile?: UserProfileSnapshotResponse | null;
}

// ─── Note ──────────────────────────────────────────────────────────────────

export interface NoteResponse {
  id: string;
  messageId: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  creatorProfile?: UserProfileSnapshotResponse | null;
}

// ─── Payloads ──────────────────────────────────────────────────────────────

export type CreatePollPayload = Pick<
  PollResponse,
  "title" | "multipleChoice" | "allowAddOptions" | "anonymous"
> & {
  options: string[];
};

export type CreateNotePayload = Pick<NoteResponse, "title" | "content">;

// ─── Message ───────────────────────────────────────────────────────────────

export interface ChatMessageResponse {
  id: string;
  senderId: string;
  channelId?: string;
  conversationId?: string;
  /** Giá trị runtime có thể là bất kỳ string nào từ backend — dùng MessageType enum khi compare. */
  type: string;
  content?: string | null;
  createdAt: string;
  updatedAt?: string;
  threadParentId?: string | null;
  threadReplyCount?: number;
  threadLastReplyAt?: string | null;
  threadFollowers?: ThreadFollowerResponse[];
  senderProfile?: UserProfileSnapshotResponse | null;
  mentions?: string[];
  medias?: ChatMediaResponse[];
  poll?: PollResponse | null;
  note?: NoteResponse | null;
  pinned?: boolean;
  reactions?: ChatReactionResponse[];
  [key: string]: unknown;
}

export interface ChatReactionResponse {
  userId?: string;
  emoji?: string;
}

// ─── Followed Threads ──────────────────────────────────────────────────────

export interface FollowedThreadResponse {
  rootMessage: ChatMessageResponse;
  chat: ConversationResponse;
  chatId: string;
  chatType: ChatUiType;
  chatName: string | null;
  replyCount: number;
  lastReplyAt: string | null;
  unreadReplyCount: number;
  isFollowing: boolean;
}

// ─── Paginated Responses ───────────────────────────────────────────────────

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

// ─── Mute ──────────────────────────────────────────────────────────────────

export interface MuteConversationResponse {
  muted: boolean;
  [key: string]: unknown;
}

// ─── Invitations ───────────────────────────────────────────────────────────

import { InvitationStatus } from "./chat.enums";

export interface SpaceInvitation {
  id: string;
  spaceId: string;
  invitedUserId: string;
  invitedBy: string;
  inviter?: UserProfileSnapshotResponse | null;
  invitee?: UserProfileSnapshotResponse | null;
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string;
  space?: SpaceResponse;
}

export interface AcceptSpaceInvitationResponse {
  invitation: SpaceInvitation;
  space: SpaceResponse;
  defaultChannel: ChannelResponse | null;
}

// ─── Misc ──────────────────────────────────────────────────────────────────

export type ChatProfilesMap = Record<string, UserProfileSnapshotResponse>;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
