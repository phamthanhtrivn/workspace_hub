import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { noteApi } from '../api/note.api';
import { ChatEvent } from '../api/chat.events';
import { socketService } from '../api/chat-socket.service';
import { chatKeys, CHAT_DEFAULT_STALE_TIME_MS } from '../types/chat.constant';
import { ChatMessageResponse, NoteResponse } from '../types/chat.types';

interface NoteUpdatePayload {
  channelId?: string;
  conversationId?: string;
  note?: NoteResponse | null;
  type?: string;
}

function getUpdatedNote(payload: NoteUpdatePayload | ChatMessageResponse) {
  return (payload as ChatMessageResponse).note ?? (payload as NoteUpdatePayload).note ?? null;
}

function getPayloadConversationId(payload: NoteUpdatePayload | ChatMessageResponse) {
  return payload.channelId ?? payload.conversationId ?? null;
}

export function useNotes(conversationId: string | undefined, q?: string) {
  const queryClient = useQueryClient();

  const queryKey = [...chatKeys.notes(conversationId), q || ""];

  const { data: notes = [], isLoading: loading } = useQuery<NoteResponse[]>({
    queryKey,
    queryFn: async () => {
      const res = await noteApi.getNotesInConversation(conversationId!, q);
      return res.success ? res.data : [];
    },
    enabled: !!conversationId,
    staleTime: CHAT_DEFAULT_STALE_TIME_MS,
  });

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    const handleNoteUpdated = (data: NoteUpdatePayload | ChatMessageResponse) => {
      const convId = getPayloadConversationId(data);

      if (convId === conversationId) {
        queryClient.invalidateQueries({
          queryKey: chatKeys.notes(conversationId),
        });
      }
    };

    socket.on(ChatEvent.NOTE_UPDATED, handleNoteUpdated);
    socket.on(ChatEvent.MESSAGE_MOVED, handleNoteUpdated);
    return () => {
      socket.off(ChatEvent.NOTE_UPDATED, handleNoteUpdated);
      socket.off(ChatEvent.MESSAGE_MOVED, handleNoteUpdated);
    };
  }, [conversationId, queryClient]);

  return { notes, loading };
}
