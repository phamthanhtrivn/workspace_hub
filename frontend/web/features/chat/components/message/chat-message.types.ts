import {
  ChatMediaResponse,
  ChatMessageResponse,
  NoteResponse,
  PollResponse,
  UserProfileSnapshotResponse,
} from "../../types/chat.types";

export type MessageMedia = ChatMediaResponse;

export interface MessageReaction {
  userId: string;
  emoji: string;
  [key: string]: unknown;
}

export type PollPayload = PollResponse;
export type NotePayload = NoteResponse;

export interface RenderableChatMessage extends ChatMessageResponse {
  recalled?: boolean;
  pinned?: boolean;
  edited?: boolean;
  medias?: MessageMedia[];
  reactions?: MessageReaction[];
  poll?: PollPayload | null;
  note?: NotePayload | null;
}

export type MemberProfilesMap = Record<string, UserProfileSnapshotResponse>;
