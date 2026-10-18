import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Loader2, Search } from "lucide-react";
import ViewNoteModal from "../../modals/message/view-note-modal";
import { useNotes } from "../../../hooks/useNotes";
import { formatDateTime } from "@/lib/date";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface NoteDetailViewProps {
  conversationId: string;
  onBack: () => void;
}

export default function NoteDetailView({
  conversationId,
  onBack,
}: NoteDetailViewProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { notes, loading } = useNotes(conversationId, debouncedSearchQuery);

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <div className="w-full h-full min-h-0 min-w-0 flex flex-col bg-card">
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Button variant="unstyled" aria-label="Back"
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="font-semibold text-foreground">
          Notes
        </h2>
      </div>

      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input unstyled
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted border border-transparent rounded-control focus:bg-card focus:border-info-outline focus:ring-1 focus:ring-ring outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-4 flex justify-center">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            {searchQuery
              ? "No matching notes found"
              : "No notes available"}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className="p-4 bg-warning-soft border border-border rounded-panel cursor-pointer hover:bg-warning-soft transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-warning-soft text-warning-content rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warning-content mb-1 truncate">
                      {note.title || "Untitled Note"}{" "}
                      -{" "}
                      {formatDateTime(note.createdAt)}
                    </p>
                    <p className="text-xs text-warning-content line-clamp-3">
                      {note.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ViewNoteModal
        isOpen={!!selectedNoteId}
        onClose={() => setSelectedNoteId(null)}
        note={selectedNote}
        conversationId={conversationId}
      />
    </div>
  );
}
