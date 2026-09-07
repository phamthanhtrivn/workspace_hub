"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SetStateAction,
} from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import type { ApiResponse } from "@/features/chat/types/chat.types";
import {
  getMeetingMessages,
  getMeetingUnreadMessageCount,
  updateMeetingChatNotificationPreference,
} from "../api/meeting.api";
import { meetingKeys } from "../types/meeting.query-keys";
import type {
  InstantMeetingResponse,
  MeetingAccessResponse,
  MeetingChatNotificationPreferenceResponse,
  MeetingMessageResponse,
  MeetingMessagesResponse,
} from "../types/meeting.types";

const MEETING_MESSAGE_PAGE_SIZE = 20;
const EMPTY_MEETING_MESSAGES: MeetingMessageResponse[] = [];

type PageParam = {
  cursor?: string;
  direction: "older" | "newer" | "around";
};

type RealtimeMessagesAction = SetStateAction<MeetingMessageResponse[]>;

function upsertMessage(
  messages: MeetingMessageResponse[],
  message: MeetingMessageResponse,
) {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) {
    return [...messages, message];
  }

  return messages.map((item) => (item.id === message.id ? message : item));
}

export function useMeetingMessages(joinToken: string) {
  const [realtimeMessagesByToken, setRealtimeMessagesByToken] = useState<
    Record<string, MeetingMessageResponse[]>
  >({});
  const { ref: loadOlderRef, inView } = useInView();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: meetingKeys.messages(joinToken),
    queryFn: async ({ pageParam }) => {
      const response = await getMeetingMessages({
        joinToken,
        cursor: (pageParam as PageParam)?.cursor,
        limit: MEETING_MESSAGE_PAGE_SIZE,
        direction: (pageParam as PageParam)?.direction ?? "older",
      });
      return response.data;
    },
    initialPageParam: {
      cursor: undefined,
      direction: "older",
    } as PageParam,
    getNextPageParam: (lastPage: MeetingMessagesResponse): PageParam | undefined =>
      lastPage?.nextCursor
        ? { cursor: lastPage.nextCursor, direction: "older" }
        : undefined,
    enabled: Boolean(joinToken),
  });

  const realtimeMessages =
    realtimeMessagesByToken[joinToken] ?? EMPTY_MEETING_MESSAGES;
  const setRealtimeMessages = useCallback(
    (action: RealtimeMessagesAction) => {
      setRealtimeMessagesByToken((current) => {
        const previousMessages = current[joinToken] ?? [];
        const nextMessages =
          typeof action === "function" ? action(previousMessages) : action;

        if (nextMessages === previousMessages) return current;

        return {
          ...current,
          [joinToken]: nextMessages,
        };
      });
    },
    [joinToken],
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage]);

  const messages = useMemo(() => {
    const pagedMessages = [...(data?.pages ?? [])]
      .reverse()
      .flatMap((page) => page.messages);

    return realtimeMessages.reduce(
      (items, message) => upsertMessage(items, message),
      pagedMessages,
    );
  }, [data?.pages, realtimeMessages]);

  return {
    messages,
    isLoading,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    loadOlderRef,
    setRealtimeMessages,
  };
}

export function useMeetingUnreadMessageCount(joinToken: string) {
  return useQuery({
    queryKey: meetingKeys.messageUnreadCount(joinToken),
    queryFn: () => getMeetingUnreadMessageCount(joinToken),
    enabled: Boolean(joinToken),
  });
}

interface MeetingChatNotificationPreferenceMutationContext {
  previousAccess?: ApiResponse<MeetingAccessResponse>;
  previousRoom?: ApiResponse<InstantMeetingResponse>;
}

function patchMeetingChatNotificationPreference(
  queryClient: QueryClient,
  joinToken: string,
  chatMuted: boolean,
) {
  queryClient.setQueryData<ApiResponse<MeetingAccessResponse>>(
    meetingKeys.access(joinToken),
    (current) => {
      if (!current) return current;

      return {
        ...current,
        data: {
          ...current.data,
          chatMuted,
        },
      };
    },
  );
  queryClient.setQueryData<ApiResponse<InstantMeetingResponse>>(
    meetingKeys.room(joinToken),
    (current) => {
      if (!current) return current;

      return {
        ...current,
        data: {
          ...current.data,
          meeting: {
            ...current.data.meeting,
            chatMuted,
          },
        },
      };
    },
  );
}

export function useUpdateMeetingChatNotificationPreference(joinToken: string) {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<MeetingChatNotificationPreferenceResponse>,
    Error,
    boolean,
    MeetingChatNotificationPreferenceMutationContext
  >({
    mutationFn: (chatMuted) =>
      updateMeetingChatNotificationPreference(joinToken, {
        chatMuted,
      }),
    onMutate: async (chatMuted) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: meetingKeys.access(joinToken),
        }),
        queryClient.cancelQueries({
          queryKey: meetingKeys.room(joinToken),
        }),
      ]);

      const previousAccess =
        queryClient.getQueryData<ApiResponse<MeetingAccessResponse>>(
          meetingKeys.access(joinToken),
        );
      const previousRoom =
        queryClient.getQueryData<ApiResponse<InstantMeetingResponse>>(
          meetingKeys.room(joinToken),
        );

      patchMeetingChatNotificationPreference(
        queryClient,
        joinToken,
        chatMuted,
      );

      return {
        previousAccess,
        previousRoom,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAccess) {
        queryClient.setQueryData(
          meetingKeys.access(joinToken),
          context.previousAccess,
        );
      }
      if (context?.previousRoom) {
        queryClient.setQueryData(
          meetingKeys.room(joinToken),
          context.previousRoom,
        );
      }
    },
    onSuccess: (response) => {
      patchMeetingChatNotificationPreference(
        queryClient,
        joinToken,
        response.data.chatMuted,
      );
    },
  });
}
