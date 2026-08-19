import { useState, useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import {
  ChatContextType,
  ChatMessageResponse,
  PaginatedMessagesResponse,
} from "../../types/chat.types";
import {
  chatKeys,
  CHAT_DEFAULT_MESSAGE_PAGE_SIZE,
} from "../../types/chat.constant";
import { getChannelMessages } from "../../api/channel.api";
import { useDirectMessageActions } from "../useDirectMessageActions";
import { useEffect } from "react";

type PageParam = {
  cursor?: string;
  direction: "older" | "newer" | "around";
};

export interface UseChatMessageListParams {
  activeChatType: ChatContextType | null | undefined;
  conversationId: string | undefined;
  /** ID tin nhắn cần jump tới (null = scroll bình thường từ cuối) */
  initialJumpTargetId?: string | null;
}

export interface UseChatMessageListReturn {
  allMessages: ChatMessageResponse[];
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  jumpTargetId: string | null;
  setJumpTargetId: (id: string | null) => void;
  loadMoreRef: (node: Element | null) => void;
  bottomBoundaryRef: (node: Element | null) => void;
  isBottomInView: boolean;
  newSocketMessages: ChatMessageResponse[];
  setNewSocketMessages: React.Dispatch<
    React.SetStateAction<ChatMessageResponse[]>
  >;
}

/**
 * Quản lý danh sách tin nhắn trong chat area với pagination hai chiều.
 *
 * - Tải tin nhắn cũ hơn khi scroll lên trên (hasNextPage)
 * - Tải tin nhắn mới hơn khi scroll xuống dưới (hasPreviousPage, chỉ khi đang jump)
 * - Ghép tin nhắn từ socket (newSocketMessages) vào danh sách hiển thị
 */
export function useChatMessageList({
  activeChatType,
  conversationId,
  initialJumpTargetId = null,
}: UseChatMessageListParams): UseChatMessageListReturn {
  const { getMessages: getDirectMessages } = useDirectMessageActions();

  const [jumpTargetId, setJumpTargetId] = useState<string | null>(
    initialJumpTargetId,
  );
  const [newSocketMessages, setNewSocketMessages] = useState<
    ChatMessageResponse[]
  >([]);

  // Reset khi đổi conversation
  useEffect(() => {
    setJumpTargetId(null);
    setNewSocketMessages([]);
  }, [conversationId]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: chatKeys.messages(activeChatType, conversationId, jumpTargetId),
    queryFn: async ({ pageParam }) => {
      const fetchMessages =
        activeChatType === ChatContextType.DIRECT_MESSAGE
          ? getDirectMessages
          : getChannelMessages;
      const response = await fetchMessages(
        conversationId!,
        (pageParam as PageParam)?.cursor,
        CHAT_DEFAULT_MESSAGE_PAGE_SIZE,
        (pageParam as PageParam)?.direction || "older",
      );
      return response.data as PaginatedMessagesResponse;
    },
    initialPageParam: (jumpTargetId
      ? { cursor: jumpTargetId, direction: "around" }
      : { cursor: undefined, direction: "older" }) as PageParam,
    getNextPageParam: (lastPage): PageParam | undefined =>
      lastPage?.nextCursor
        ? { cursor: lastPage.nextCursor, direction: "older" }
        : undefined,
    getPreviousPageParam: (firstPage): PageParam | undefined =>
      firstPage?.prevCursor
        ? { cursor: firstPage.prevCursor, direction: "newer" }
        : undefined,
    enabled: !!conversationId,
  });

  const { ref: loadMoreRef, inView } = useInView();
  const { ref: bottomBoundaryRef, inView: isBottomInView } = useInView();

  // Load more khi scroll lên trên
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Load newer khi scroll xuống dưới (chỉ khi đang xem lịch sử cũ)
  useEffect(() => {
    if (isBottomInView && hasPreviousPage && !isFetchingPreviousPage) {
      fetchPreviousPage();
    }
  }, [
    isBottomInView,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
  ]);

  const allMessages = useMemo(() => {
    const messagePages = data?.pages;
    if (!messagePages) return [...newSocketMessages].reverse();

    const pagesMessages = messagePages.flatMap((page) =>
      [...page.messages].reverse(),
    );
    if (hasPreviousPage) {
      return pagesMessages;
    }
    return [...[...newSocketMessages].reverse(), ...pagesMessages];
  }, [data?.pages, newSocketMessages, hasPreviousPage]);

  return {
    allMessages,
    isLoading,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    jumpTargetId,
    setJumpTargetId,
    loadMoreRef,
    bottomBoundaryRef,
    isBottomInView,
    newSocketMessages,
    setNewSocketMessages,
  };
}
