import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pollApi } from "../api/poll.api";
import { ChatEvent } from "../api/chat.events";
import { socketService } from "../api/chat-socket.service";
import { CHAT_DEFAULT_STALE_TIME_MS, chatKeys } from "../types/chat.constant";
import { ChatMessageResponse, PollResponse } from "../types/chat.types";

interface PollUpdatePayload {
  channelId?: string;
  conversationId?: string;
  poll?: PollResponse | null;
  type?: string;
}

function getUpdatedPoll(payload: PollUpdatePayload | ChatMessageResponse) {
  return (payload as ChatMessageResponse).poll ?? (payload as PollUpdatePayload).poll ?? null;
}

function getPayloadConversationId(payload: PollUpdatePayload | ChatMessageResponse) {
  return payload.channelId ?? payload.conversationId ?? null;
}

export function usePolls(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const queryKey = chatKeys.polls(conversationId);

  const { data: polls = [], isLoading: loading } = useQuery<PollResponse[]>({
    queryKey,
    queryFn: async () => {
      const res = await pollApi.getPollsInConversation(conversationId!);
      return res.success ? res.data : [];
    },
    enabled: !!conversationId,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    const handlePollUpdated = (data: PollUpdatePayload | ChatMessageResponse) => {
      const pollData = getUpdatedPoll(data);
      const convId = getPayloadConversationId(data);

      if (convId === conversationId && pollData) {
        queryClient.setQueryData<PollResponse[]>(queryKey, (prev) => {
          if (!prev) return [pollData];
          const exists = prev.findIndex((p) => p.id === pollData.id);
          if (exists !== -1) {
            const newPolls = [...prev];
            newPolls[exists] = pollData;
            return newPolls;
          }
          return [pollData, ...prev];
        });
      }
    };

    socket.on(ChatEvent.POLL_UPDATED, handlePollUpdated);
    socket.on(ChatEvent.MESSAGE_MOVED, handlePollUpdated);
    return () => {
      socket.off(ChatEvent.POLL_UPDATED, handlePollUpdated);
      socket.off(ChatEvent.MESSAGE_MOVED, handlePollUpdated);
    };
  }, [conversationId, queryClient]);

  return { polls, loading };
}
