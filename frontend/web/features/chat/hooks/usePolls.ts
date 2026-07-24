import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pollApi } from "../api/poll.api";
import { ChatEvent } from "../api/chat.events";
import { socketService } from "../api/chat-socket.service";

export function usePolls(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: polls = [], isLoading: loading } = useQuery({
    queryKey: ["polls", conversationId],
    queryFn: async () => {
      const res = await pollApi.getPollsInConversation(conversationId!);
      return res.success ? res.data : [];
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    const handlePollUpdated = (data: any) => {
      let pollData = null;
      let convId = null;

      if (data.type === "POLL" && data.poll) {
        // From MESSAGE_MOVED
        pollData = data.poll;
        convId = data.conversationId;
      } else if (data.poll) {
        // From POLL_UPDATED
        pollData = data.poll;
        convId = data.conversationId;
      }

      if (convId === conversationId && pollData) {
        queryClient.setQueryData<any[]>(["polls", conversationId], (prev) => {
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
