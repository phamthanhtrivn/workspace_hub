import { User } from "lucide-react";
import React from "react";

interface MentionDropdownProps {
  query: string | null;
  members: any[];
  selectedIndex: number;
  onSelect: (user: any) => void;
}

export default React.memo(function MentionDropdown({
  query,
  members,
  selectedIndex,
  onSelect,
}: MentionDropdownProps) {
  if (query === null || members.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
      {members.map((user, idx) => (
        <button
          key={user.id}
          onClick={(e) => {
            e.preventDefault();
            onSelect(user);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
            idx === selectedIndex
              ? "bg-blue-50 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs flex-shrink-0 overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={15} className="text-gray-400" />
            )}
          </div>
          <span className="truncate">{user.name}</span>
        </button>
      ))}
    </div>
  );
});
