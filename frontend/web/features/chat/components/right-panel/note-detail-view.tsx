import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Loader2, Search } from "lucide-react";
import ViewNoteModal from "../modals/view-note-modal";
import { useNotes } from "../../hooks/useNotes";
import { formatDateTime } from "@/lib/date";
import { NoteResponse } from "../../types/chat.types";

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
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-800">Notes</h2>
      </div>

      <div className="border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-4 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            {searchQuery ? "No matching notes found" : "No notes available"}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className="p-4 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 mb-1 truncate">
                      {note.title || "Untitled note"} - {formatDateTime(note.createdAt)}
                    </p>
                    <p className="text-xs text-amber-700/80 line-clamp-3">
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
