import { ChatEvent } from "../api/chat.events";
import {
  ChatContextType,
  ChatMessageResponse,
  ConversationMember,
  ConversationSetting,
  SpaceSettingResponse,
  UserProfileSnapshotResponse,
} from "./chat.types";

export interface ChatContextPayload {
  chatId: string;
  chatType: ChatContextType;
  channelId?: string;
  conversationId?: string;
}

export type ThreadFollowerPayload =
  | string
  | {
      userId: string;
    };

export interface ChatSocketMessagePayload
  extends ChatMessageResponse, Partial<ChatContextPayload> {
  mentions?: string[];
  threadFollowers?: ThreadFollowerPayload[];
}

export interface ChatSocketReadPayload extends Partial<ChatContextPayload> {
  userId: string;
  messageId: string;
  readAt?: string;
}

export interface SendReadSocketPayload extends Partial<ChatContextPayload> {
  messageId: string;
}

export interface JoinChannelSocketPayload extends ChatContextPayload {
  channelId: string;
  chatType: ChatContextType.CHANNEL;
}

export interface JoinDirectSocketPayload extends ChatContextPayload {
  conversationId: string;
  chatType: ChatContextType.DIRECT_MESSAGE;
}

export interface ChatSocketMemberPayload extends Partial<ChatContextPayload> {
  eventType?: string;
  userId?: string;
  member?: ConversationMember;
  profile?: unknown;
  spaceId?: string;
  spaceName?: string | null;
  channelIds?: string[];
  affectedUserIds?: string[];
  leftSpace?: boolean;
  actorProfile?: UserProfileSnapshotResponse | null;
  targetProfile?: UserProfileSnapshotResponse | null;
}

export interface ChatSocketRoleUpdatedPayload extends Partial<ChatContextPayload> {
  eventType?: string;
  spaceId?: string;
  spaceName?: string | null;
  affectedUserIds?: string[];
  actorProfile?: UserProfileSnapshotResponse | null;
  targetProfile?: UserProfileSnapshotResponse | null;
  member: Pick<ConversationMember, "userId" | "role">;
}

export interface ChatSocketSettingUpdatedPayload extends Partial<ChatContextPayload> {
  eventType?: string;
  spaceId?: string;
  spaceName?: string | null;
  affectedUserIds?: string[];
  setting: ConversationSetting | SpaceSettingResponse;
}

export interface ChatSocketUpdatedPayload extends Partial<ChatContextPayload> {
  id: string;
  name?: string;
  avatarUrl?: string;
}

export interface ChatSocketDisbandedPayload extends Partial<ChatContextPayload> {
  eventType?: string;
  spaceId?: string;
  spaceName?: string | null;
  channelName?: string | null;
  channelIds?: string[];
  affectedUserIds?: string[];
  leftSpace?: boolean;
  actorProfile?: UserProfileSnapshotResponse | null;
}

export interface ChatSocketMuteUpdatedPayload extends Partial<ChatContextPayload> {
  muted: boolean;
}

export interface ChatSocketMediaUpdatedPayload extends Partial<ChatContextPayload> {
  messageId: string;
  media: ChatMessageResponse["medias"];
}

export interface ChatSocketTypingPayload extends Partial<ChatContextPayload> {
  userId: string;
  isTyping: boolean;
}

export interface SendTypingSocketPayload extends Partial<ChatContextPayload> {
  userId?: string;
  isTyping: boolean;
}

export type ChatSocketUnknownPayload = Record<string, unknown>;

export interface SendSocketMessageMedia {
  name: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ChatSocketAckResponse<T = ChatMessageResponse> {
  status?: "success" | "error";
  message?: string;
  data?: T;
}

export interface SendChannelSocketMessagePayload {
  [key: string]: unknown;
  channelId: string;
  chatId: string;
  chatType: ChatContextType.CHANNEL;
  content: string;
  type?: string;
  medias?: SendSocketMessageMedia[];
  mentions?: string[];
}

export interface SendDirectSocketMessagePayload {
  conversationId: string;
  chatId: string;
  chatType: ChatContextType.DIRECT_MESSAGE;
  content: string;
  medias?: SendSocketMessageMedia[];
  threadParentId?: string;
  mentions?: string[];
}

export interface ServerToClientChatEvents {
  [event: string]: (...args: never[]) => void;
  [ChatEvent.NEW_MESSAGE]: (payload: ChatSocketMessagePayload) => void;
  [ChatEvent.MESSAGE_MOVED]: (payload: ChatSocketMessagePayload) => void;
  [ChatEvent.MESSAGE_UPDATED]: (payload: ChatSocketMessagePayload) => void;
  [ChatEvent.REACTION_UPDATED]: (payload: ChatSocketMessagePayload) => void;
  [ChatEvent.MESSAGE_PINNED]: (payload: ChatSocketMessagePayload) => void;
  [ChatEvent.MESSAGE_UNPINNED]: (payload: ChatSocketMessagePayload) => void;
  [ChatEvent.MESSAGE_READ]: (payload: ChatSocketReadPayload) => void;
  [ChatEvent.TYPING]: (payload: SendTypingSocketPayload) => void;
  [ChatEvent.TYPING_DIRECT]: (payload: SendTypingSocketPayload) => void;
  [ChatEvent.JOIN_CONVERSATION]: (payload: ChatSocketMemberPayload) => void;
  [ChatEvent.CHANNEL_SETTING_UPDATED]: (
    payload: ChatSocketSettingUpdatedPayload,
  ) => void;
  [ChatEvent.MEMBER_ROLE_UPDATED]: (
    payload: ChatSocketRoleUpdatedPayload,
  ) => void;
  [ChatEvent.MEMBER_KICKED]: (payload: ChatSocketMemberPayload) => void;
  [ChatEvent.MEMBER_LEFT]: (payload: ChatSocketMemberPayload) => void;
  [ChatEvent.CONVERSATION_UPDATED]: (payload: ChatSocketUpdatedPayload) => void;
  [ChatEvent.CONVERSATION_DISBANDED]: (
    payload: ChatSocketDisbandedPayload,
  ) => void;
  [ChatEvent.CONVERSATION_MUTE_UPDATED]: (
    payload: ChatSocketMuteUpdatedPayload,
  ) => void;
  [ChatEvent.MEDIA_UPDATED]: (payload: ChatSocketMediaUpdatedPayload) => void;
  [ChatEvent.POLL_UPDATED]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.NOTE_UPDATED]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.SPACE_INVITATION]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.INVITATION_ACCEPTED]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.INVITATION_DECLINED]: (payload: ChatSocketUnknownPayload) => void;
}

export interface ClientToServerChatEvents {
  [event: string]: (...args: never[]) => void;
  [ChatEvent.SEND_MESSAGE]: (
    payload: SendChannelSocketMessagePayload,
    ack?: (response: ChatSocketAckResponse) => void,
  ) => void;
  [ChatEvent.SEND_DIRECT_MESSAGE]: (
    payload: SendDirectSocketMessagePayload,
    ack?: (response: ChatSocketAckResponse) => void,
  ) => void;
  [ChatEvent.JOIN_CONVERSATION]: (payload: JoinChannelSocketPayload) => void;
  [ChatEvent.JOIN_DIRECT_CONVERSATION]: (
    payload: JoinDirectSocketPayload,
  ) => void;
  [ChatEvent.READ_MESSAGE]: (payload: SendReadSocketPayload) => void;
  [ChatEvent.READ_DIRECT_MESSAGE]: (payload: SendReadSocketPayload) => void;
  [ChatEvent.TYPING]: (payload: ChatSocketTypingPayload) => void;
  [ChatEvent.TYPING_DIRECT]: (payload: ChatSocketTypingPayload) => void;
  [ChatEvent.EDIT_MESSAGE]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.RECALL_MESSAGE]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.REACT_MESSAGE]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.PIN_MESSAGE]: (
    payload: ChatSocketUnknownPayload,
    ack?: (response: ChatSocketAckResponse) => void,
  ) => void;
  [ChatEvent.UNPIN_MESSAGE]: (
    payload: ChatSocketUnknownPayload,
    ack?: (response: ChatSocketAckResponse) => void,
  ) => void;
  [ChatEvent.VOTE_POLL]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.ADD_POLL_OPTION]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.EDIT_POLL]: (payload: ChatSocketUnknownPayload) => void;
  [ChatEvent.EDIT_NOTE]: (payload: ChatSocketUnknownPayload) => void;
}
