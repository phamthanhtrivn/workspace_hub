import React from "react";
import { CheckSquare, ChevronDown, ChevronRight } from "lucide-react";

interface TasksSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function TasksSection({
  isExpanded,
  onToggle,
}: TasksSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <CheckSquare size={18} className="text-gray-500" />
          Tasks
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
    </div>
  );
}
