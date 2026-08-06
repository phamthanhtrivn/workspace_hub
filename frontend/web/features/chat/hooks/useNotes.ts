import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { noteApi } from '../api/note.api';
import { ChatEvent } from '../api/chat.events';
import { socketService } from '../api/chat-socket.service';

export function useNotes(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading: loading } = useQuery({
    queryKey: ["notes", conversationId],
    queryFn: async () => {
      const res = await noteApi.getNotesInConversation(conversationId!);
      return res.success ? res.data : [];
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    const handleNoteUpdated = (data: any) => {
      let noteData = null;
      let convId = null;

      if (data.type === 'NOTE' && data.note) {
        // From MESSAGE_MOVED
        noteData = data.note;
        convId = data.conversationId;
      } else if (data.note) {
        // From NOTE_UPDATED
        noteData = data.note;
        convId = data.conversationId;
      }

      if (convId === conversationId && noteData) {
        queryClient.setQueryData<any[]>(["notes", conversationId], (prev) => {
          if (!prev) return [noteData];
          const exists = prev.findIndex((n) => n.id === noteData.id);
          if (exists !== -1) {
            const newNotes = [...prev];
            newNotes[exists] = noteData;
            return newNotes;
          }
          return [noteData, ...prev];
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
