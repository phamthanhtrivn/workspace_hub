import React from "react";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";

interface NotesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function NotesSection({
  isExpanded,
  onToggle,
}: NotesSectionProps) {
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
        <div className="px-4 pb-4 text-center text-sm text-gray-500 py-4">
          No notes yet
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>
    </div>
  );
}
