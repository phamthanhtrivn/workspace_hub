export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
export const NO_AVATAR_TYPES = ["POLL", "NOTE", "TASK", "SYSTEM", "EVENT"];

export enum ChatContextType {
  DIRECT_MESSAGE = "DIRECT_MESSAGE",
  CHANNEL = "CHANNEL",
}

export enum ConversationRoles {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum SpaceRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

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

export type ConversationRole = ConversationRoles.ADMIN | ConversationRoles.MEMBER;
export type SpaceMemberRole = SpaceRole.ADMIN | SpaceRole.MEMBER;
export type ChatUiType = ChatContextType.DIRECT_MESSAGE | ChatContextType.CHANNEL;

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

export interface ChannelMemberListItem extends ConversationMember {
  profile: UserProfileSnapshotResponse | null;
}

export interface ChannelMembersListResponse {
  total: number;
  admins: ChannelMemberListItem[];
  members: ChannelMemberListItem[];
  nextCursor?: string | null;
}

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

export type ThreadFollowerResponse =
  | string
  | {
      userId: string;
      lastReadAt?: string | null;
    };

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

export type CreatePollPayload = Pick<
  PollResponse,
  "title" | "multipleChoice" | "allowAddOptions" | "anonymous"
> & {
  options: string[];
};

export type CreateNotePayload = Pick<NoteResponse, "title" | "content">;

export interface ChatMessageResponse {
  id: string;
  senderId: string;
  channelId?: string;
  conversationId?: string;
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
  [key: string]: unknown;
}

export interface FollowedThreadResponse {
  rootMessage: ChatMessageResponse;
  chat: ConversationResponse;
  chatId: string;
  chatType: ChatContextType;
  chatName: string | null;
  replyCount: number;
  lastReplyAt: string | null;
  unreadReplyCount: number;
  isFollowing: boolean;
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

export interface SpaceInvitation {
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
  space?: SpaceResponse;
}

export interface AcceptSpaceInvitationResponse {
  invitation: SpaceInvitation;
  space: SpaceResponse;
  defaultChannel: ChannelResponse | null;
}

export type ChatProfilesMap = Record<string, UserProfileSnapshotResponse>;

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
