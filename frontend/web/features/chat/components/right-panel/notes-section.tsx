import { FileText, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useAppSelector } from "@/store/store";
import { formatDividerTime } from "@/lib/date";
import { useNotes } from "../../hooks/useNotes";
import ViewNoteModal from "../view-note-modal";
import { useState } from "react";

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

  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  const { notes, loading } = useNotes(activeConversation?.id);

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
          {loading ? (
            <div className="text-center py-4 flex justify-center">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              No notes yet
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="p-3 bg-amber-50 border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <p className="text-xs font-semibold text-amber-900 mb-1 truncate">
                  {note.title} - {formatDividerTime(note.createdAt)}
                </p>
                <p className="text-[10px] text-amber-700/80 line-clamp-2">
                  {note.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>

      <ViewNoteModal
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        note={notes.find((n) => n.id === selectedNote?.id) || selectedNote}
        conversationId={activeConversation?.id || ""}
      />
    </div>
  );
}
