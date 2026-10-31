"use client";

import { useEffect } from "react";
import { useAppSelector } from "@/store/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChannelMedia, getDirectConversationMedia } from "../api/chat.api";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";
import { CHAT_DEFAULT_STALE_TIME_MS, ChatScope, chatKeys } from "../types/chat.constant";
import type { ChatMediaResponse, PaginatedMediaResponse } from "../types/chat.types";
import type { ChatSocketMediaUpdatedPayload } from "../types/chat-socket.types";

const EMPTY_MEDIA: ChatMediaResponse[] = [];
const previewKey = (scope: ChatScope, chatId: string | undefined) => [...chatKeys.media(scope, chatId), "preview"] as const;

export function useChatMediaPreview(scope: ChatScope, chatId: string | undefined, enabled: boolean) {
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: previewKey(scope, chatId),
    queryFn: async () => {
      const fetchMedia = scope === ChatScope.DIRECT ? getDirectConversationMedia : getChannelMedia;
      return (await fetchMedia(chatId!)).data;
    },
    enabled: enabled && !!chatId,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
    retry: false,
  });

  useEffect(() => {
    if (!accessToken || !chatId) return;
    const socket = socketService.connect(accessToken);
    const updateMedia = (payload: ChatSocketMediaUpdatedPayload) => {
      if ((payload.channelId ?? payload.conversationId) !== chatId || !payload.media) return;
      const addedMedia = payload.media;
      queryClient.setQueryData<PaginatedMediaResponse>(previewKey(scope, chatId), previous => {
        if (!previous) return previous;
        const seen = new Set<string>();
        const medias = [...addedMedia, ...previous.medias].filter(media => {
          if (seen.has(media.id)) return false;
          seen.add(media.id);
          return true;
        });
        return { ...previous, medias };
      });
      void queryClient.invalidateQueries({ queryKey: previewKey(scope, chatId) });
    };
    socket.on(ChatEvent.MEDIA_UPDATED, updateMedia);
    return () => { socket.off(ChatEvent.MEDIA_UPDATED, updateMedia); };
  }, [scope, chatId, queryClient, accessToken]);

  return { ...query, medias: query.data?.medias ?? EMPTY_MEDIA };
}
