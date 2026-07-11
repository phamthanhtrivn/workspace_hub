import { useState, useEffect } from 'react';
import { noteApi } from '../api/note.api';
import { ChatEvent } from '../api/chat.events';
import { socketService } from '../api/chat-socket.service';

export function useNotes(conversationId: string | undefined) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    const fetchNotes = async () => {
      try {
        setLoading(true);
        const res = await noteApi.getNotesInConversation(conversationId);
        if (res.success) {
          setNotes(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch notes', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [conversationId]);

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
        setNotes((prev) => {
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
  }, [conversationId]);

  return { notes, loading };
}
