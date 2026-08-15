import {
  ChatMediaResponse,
  ChatMessageResponse,
  UserProfileSnapshotResponse,
} from "../../types/chat.types";

export type MessageMedia = ChatMediaResponse;

export interface MessageReaction {
  userId: string;
  emoji: string;
  [key: string]: unknown;
}

export interface PollPayload {
  id: string;
  title: string;
  multipleChoice: boolean;
  allowAddOptions: boolean;
  anonymous: boolean;
  isLocked?: boolean;
  createdBy: string;
  createdAt: string;
  options: {
    id: string;
    text: string;
    createdBy?: string;
    votes?: { userId: string }[];
  }[];
}

export interface NotePayload {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface RenderableChatMessage extends ChatMessageResponse {
  recalled?: boolean;
  pinned?: boolean;
  edited?: boolean;
  medias?: MessageMedia[];
  reactions?: MessageReaction[];
  poll?: PollPayload;
  note?: NotePayload;
}

export type MemberProfilesMap = Record<string, UserProfileSnapshotResponse>;
