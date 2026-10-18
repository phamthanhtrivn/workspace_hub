import { FileText, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/date";
import { useNotes } from "../../../hooks/useNotes";
import ViewNoteModal from "../../modals/message/view-note-modal";
import { useState } from "react";
import { useActiveChat } from "../../../hooks/useChatQueries";
import { NoteResponse } from "../../../types/chat.types";
import SeeAllButton from "../see-all-button";

interface NotesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll?: () => void;
}

export default function NotesSection({
  isExpanded,
  onToggle,
  onSeeAll,
}: NotesSectionProps) {
  const { activeChat: activeConversation } = useActiveChat();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const { notes, loading } = useNotes(activeConversation?.id);

  const displayNotes = notes.slice(0, 3);
  const hasMore = notes.length > 3;

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-background transition"
      >
        <div className="flex items-center gap-3 text-foreground font-medium text-sm">
          <FileText size={18} className="text-muted-foreground" />
          Notes
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="text-muted-foreground animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No notes yet
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {displayNotes.map((note: NoteResponse) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className="p-3 bg-warning-soft border border-border rounded-lg cursor-pointer hover:bg-warning-soft transition-colors"
                  >
                    <p className="text-xs font-semibold text-warning-content mb-1 truncate">
                      {note.title || "Untitled Note"}{" "}
                      -{" "}
                      {formatDateTime(note.createdAt)}
                    </p>
                    <p className="text-xs text-warning-content line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
              {hasMore && (
                <SeeAllButton onClick={onSeeAll}>
                  See all
                </SeeAllButton>
              )}
            </>
          )}
        </div>
      )}
      <div className="h-px bg-muted mx-4 my-1"></div>

      <ViewNoteModal
        isOpen={!!selectedNoteId}
        onClose={() => setSelectedNoteId(null)}
        note={selectedNote}
        conversationId={activeConversation?.id || ""}
      />
    </div>
  );
}
