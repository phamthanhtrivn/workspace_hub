import { ChatContextType } from "./chat.types";

export const MAX_UNREAD_COUNT = 99;
export const CHAT_DEFAULT_STALE_TIME_MS = 1000 * 60 * 5;
export const CHAT_DEFAULT_MESSAGE_PAGE_SIZE = 20;

export enum ChatQueryRoot {
  SPACES = "spaces",
  CHANNELS = "channels",
  DIRECT_MESSAGES = "direct-messages",
  MESSAGES = "messages",
  MEMBER_PROFILES = "chat-member-profiles",
  READ_RECEIPTS = "read-receipts",
  PINNED_MESSAGES_PREVIEW = "pinnedMessagesPreview",
  PINNED_MESSAGES_DETAIL = "pinnedMessagesDetail",
  MEDIA = "media",
  THREADS = "conversation-threads",
  FOLLOWED_THREADS = "followed-threads",
  THREAD_MESSAGES = "threadMessages",
  NOTES = "notes",
  POLLS = "polls",
}

export enum ChatQueryKey {
  DIRECT_MESSAGES = ChatQueryRoot.DIRECT_MESSAGES,
  DIRECT_CONVERSATIONS = ChatQueryRoot.DIRECT_MESSAGES,
}

export enum ChatScope {
  DIRECT = "direct",
  CHANNEL = "channel",
}

export const chatKeys = {
  allSpaces: () => [ChatQueryRoot.SPACES] as const,
  allChannels: () => [ChatQueryRoot.CHANNELS] as const,
  allDirectMessages: () => [ChatQueryRoot.DIRECT_MESSAGES] as const,
  allMessages: () => [ChatQueryRoot.MESSAGES] as const,
  allMemberProfiles: () => [ChatQueryRoot.MEMBER_PROFILES] as const,
  allMedia: () => [ChatQueryRoot.MEDIA] as const,
  allPinnedMessagesPreview: () => [ChatQueryRoot.PINNED_MESSAGES_PREVIEW] as const,
  allPinnedMessagesDetail: () => [ChatQueryRoot.PINNED_MESSAGES_DETAIL] as const,
  allThreads: () => [ChatQueryRoot.THREADS] as const,
  allFollowedThreads: () => [ChatQueryRoot.FOLLOWED_THREADS] as const,
  allThreadMessages: () => [ChatQueryRoot.THREAD_MESSAGES] as const,
  spaces: (userId?: string | null) => [ChatQueryRoot.SPACES, userId] as const,
  channels: (spaceId?: string | null) => [ChatQueryRoot.CHANNELS, spaceId] as const,
  directMessages: (userId?: string | null) =>
    [ChatQueryKey.DIRECT_MESSAGES, userId] as const,
  messages: (
    chatType?: ChatContextType | null,
    chatId?: string | null,
    jumpTargetId?: string | null,
  ) => [ChatQueryRoot.MESSAGES, chatType, chatId, jumpTargetId ?? null] as const,
  memberProfiles: (userIdsKey?: string) =>
    [ChatQueryRoot.MEMBER_PROFILES, userIdsKey ?? ""] as const,
  readReceipts: (
    chatType?: ChatContextType | null,
    chatId?: string | null,
  ) => [ChatQueryRoot.READ_RECEIPTS, chatType, chatId] as const,
  pinnedMessagesPreview: (
    scope: ChatScope,
    chatId?: string | null,
  ) => [ChatQueryRoot.PINNED_MESSAGES_PREVIEW, scope, chatId] as const,
  pinnedMessagesDetail: (
    scope: ChatScope,
    chatId?: string | null,
  ) => [ChatQueryRoot.PINNED_MESSAGES_DETAIL, scope, chatId] as const,
  media: (scope: ChatScope, chatId?: string | null) =>
    [ChatQueryRoot.MEDIA, scope, chatId] as const,
  threads: (scope: ChatScope, chatId?: string | null) =>
    [ChatQueryRoot.THREADS, scope, chatId] as const,
  followedThreads: (userId?: string | null) =>
    [ChatQueryRoot.FOLLOWED_THREADS, userId] as const,
  threadMessages: (
    scope: ChatScope,
    messageId?: string | null,
  ) => [ChatQueryRoot.THREAD_MESSAGES, scope, messageId] as const,
  notes: (chatId?: string | null) => [ChatQueryRoot.NOTES, chatId] as const,
  polls: (chatId?: string | null) => [ChatQueryRoot.POLLS, chatId] as const,
};

export enum ChatSidebarSection {
  THREADS = "Threads",
  DIRECT_MESSAGES = "Direct Messages (DMs)",
}
