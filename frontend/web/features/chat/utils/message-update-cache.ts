import type { Query, QueryClient } from '@tanstack/react-query';
import { chatKeys, ChatQueryRoot, ChatScope } from '../types/chat.constant';
import { ChatContextType } from '../types/chat.enums';
import type { ChatContextPayload } from '../types/chat-socket.types';
import type { ApiResponse, ChatMessageResponse, FollowedThreadResponse, PaginatedMessagesResponse, ThreadMessagesResponse } from '../types/chat.types';

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

export async function applyChatMessageUpdate(client: QueryClient, update: ChatMessageUpdate & Partial<ChatContextPayload>): Promise<void> {
  const chatId = update.channelId ?? update.conversationId ?? update.chatId;
  const context = update.chatType ?? (update.conversationId ? ChatContextType.DIRECT_MESSAGE : update.channelId ? ChatContextType.CHANNEL : undefined);
  const scope = context === ChatContextType.CHANNEL ? ChatScope.CHANNEL : ChatScope.DIRECT;
  const threadIds = new Set([update.id, update.threadParentId].filter(Boolean));
  const matchesThread = (query: Query): boolean => {
    if (query.queryKey[0] !== ChatQueryRoot.THREAD_MESSAGES) return false;
    if (context && query.queryKey[1] !== scope) return false;
    if (typeof query.queryKey[2] === 'string' && threadIds.has(query.queryKey[2])) return true;
    const response = query.state.data as ApiResponse<ThreadMessagesResponse> | undefined;
    return response?.data?.rootMessage?.id === update.id ||
      Boolean(response?.data?.replies.some(reply => reply.id === update.id));
  };
  const matchesConversation = (query: Query): boolean => {
    if (!chatId || !context) return false;
    if (query.queryKey[0] === ChatQueryRoot.MESSAGES) {
      return query.queryKey[1] === context && query.queryKey[2] === chatId;
    }
    return [ChatQueryRoot.PINNED_MESSAGES_PREVIEW, ChatQueryRoot.PINNED_MESSAGES_DETAIL, ChatQueryRoot.THREADS]
      .some(root => root === query.queryKey[0]) && query.queryKey[1] === scope && query.queryKey[2] === chatId;
  };
  const predicate = (query: Query) => matchesThread(query) || matchesConversation(query);
  // Cancel older requests before patching, then reconcile only the affected caches.
  await client.cancelQueries({ predicate });
  client.setQueriesData<{ pages?: PaginatedMessagesResponse[] }>({ queryKey: chatKeys.allMessages(), predicate: matchesConversation }, previous => {
    if (!previous?.pages) return previous;
    return { ...previous, pages: previous.pages.map(page => ({ ...page,
      messages: page.messages.map(message => mergeChatMessageUpdate(message, update)),
    })) };
  });
  client.setQueriesData<ApiResponse<ThreadMessagesResponse>>({ predicate: matchesThread }, response => {
    if (!response?.data) return response;
    return { ...response, data: { ...response.data,
      rootMessage: response.data.rootMessage ? mergeChatMessageUpdate(response.data.rootMessage, update) : undefined,
      replies: response.data.replies.map(reply => mergeChatMessageUpdate(reply, update)),
    } };
  });
  client.setQueriesData<FollowedThreadResponse[]>({ queryKey: chatKeys.allFollowedThreads() }, threads =>
    Array.isArray(threads) ? threads.map(thread => ({ ...thread, rootMessage: mergeChatMessageUpdate(thread.rootMessage, update) })) : threads);
  await client.invalidateQueries({ predicate });
}
