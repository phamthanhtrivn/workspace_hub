import React from "react";
import { BarChart2, ChevronDown, ChevronRight } from "lucide-react";

interface PollsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function PollsSection({
  isExpanded,
  onToggle,
}: PollsSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <BarChart2 size={18} className="text-gray-500" />
          Polls
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-1">
              What time works best?
            </p>
            <p className="text-xs text-gray-500">Active • 2 votes</p>
          </div>
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>
    </div>
  );
}
