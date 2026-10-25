import type { QueryClient } from '@tanstack/react-query';
import { chatKeys } from '../types/chat.constant';
import type { ApiResponse, ChatMessageResponse, FollowedThreadResponse, ThreadMessagesResponse } from '../types/chat.types';

export type ChatMessageUpdate = Pick<ChatMessageResponse, 'id'> & Partial<ChatMessageResponse>;

function taskVersion(content?: string | null): bigint | null {
  try {
    const value: unknown = JSON.parse(content || 'null');
    if (value && typeof value === 'object' && 'taskVersion' in value &&
      typeof value.taskVersion === 'string' && /^\d+$/.test(value.taskVersion)) return BigInt(value.taskVersion);
  } catch { /* Regular messages have no task version. */ }
  return null;
}

export function mergeChatMessageUpdate(message: ChatMessageResponse, update: ChatMessageUpdate): ChatMessageResponse {
  if (message.id !== update.id) return message;
  const currentVersion = taskVersion(message.content);
  const incomingVersion = taskVersion(update.content);
  if (currentVersion !== null && incomingVersion !== null && incomingVersion < currentVersion) return message;
  return { ...message, ...update };
}

export function patchThreadMessageCaches(client: QueryClient, update: ChatMessageUpdate): void {
  client.setQueriesData<ApiResponse<ThreadMessagesResponse>>({ queryKey: chatKeys.allThreadMessages() }, response => {
    if (!response?.data) return response;
    return { ...response, data: { ...response.data,
      rootMessage: response.data.rootMessage ? mergeChatMessageUpdate(response.data.rootMessage, update) : undefined,
      replies: response.data.replies.map(reply => mergeChatMessageUpdate(reply, update)),
    } };
  });
  client.setQueriesData<FollowedThreadResponse[]>({ queryKey: chatKeys.allFollowedThreads() }, threads =>
    Array.isArray(threads) ? threads.map(thread => ({ ...thread, rootMessage: mergeChatMessageUpdate(thread.rootMessage, update) })) : threads);
  // Refetch after patching so a request started before this event cannot restore an older root.
  void client.invalidateQueries({ queryKey: chatKeys.allThreadMessages() });
  for (const queryKey of [chatKeys.allPinnedMessagesPreview(), chatKeys.allPinnedMessagesDetail(), chatKeys.allThreads()]) {
    void client.invalidateQueries({ queryKey });
  }
}
