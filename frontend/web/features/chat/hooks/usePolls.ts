import { useState, useEffect } from "react";
import { pollApi } from "../api/poll.api";
import { ChatEvent } from "../api/chat.events";
import { socketService } from "../api/chat-socket.service";

export function usePolls(conversationId: string | undefined) {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    const fetchPolls = async () => {
      try {
        setLoading(true);
        const res = await pollApi.getPollsInConversation(conversationId);
        if (res.success) {
          setPolls(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch polls", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, [conversationId]);

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
        setPolls((prev) => {
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
  }, [conversationId]);

  return { polls, loading };
}
