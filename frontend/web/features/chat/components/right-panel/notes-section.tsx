import React, { useEffect, useState } from "react";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useAppSelector } from "@/store/store";
import { ChatEvent } from "../../api/chat.events";
import { socketService } from "../../api/chat-socket.service";

interface NotesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function NotesSection({
  isExpanded,
  onToggle,
}: NotesSectionProps) {
  const activeConversation = useAppSelector(
    (state) => state.chat.activeConversation,
  );
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !activeConversation) return;

    const handleNoteUpdated = (data: any) => {
      if (data.conversationId === activeConversation.id && data.note) {
        setNotes((prev) => {
          const exists = prev.findIndex((n) => n.id === data.note.id);
          if (exists !== -1) {
            const newNotes = [...prev];
            newNotes[exists] = data.note;
            return newNotes;
          }
          return [data.note, ...prev];
        });
      }
    };

    socket.on(ChatEvent.NOTE_UPDATED, handleNoteUpdated);
    return () => {
      socket.off(ChatEvent.NOTE_UPDATED, handleNoteUpdated);
    };
  }, [activeConversation?.id]);
  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <FileText size={18} className="text-gray-500" />
          Notes
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              No notes yet
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg"
              >
                <p className="text-xs font-semibold text-yellow-800 mb-1 truncate">
                  {note.title}
                </p>
                <p className="text-[10px] text-yellow-600 line-clamp-2">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>
    </div>
  );
}
