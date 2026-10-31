import type { MentionMemberOption } from "../../utils/mention-member-utils";
import { User, Users } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";


interface MentionDropdownProps {
  query: string | null;
  id: string;
  members: MentionMemberOption[];
  selectedIndex: number;
  onSelect: (user: MentionMemberOption) => void;
}

export default React.memo(function MentionDropdown({
  query,
  id,
  members,
  selectedIndex,
  onSelect,
}: MentionDropdownProps) {
  React.useEffect(() => {
    document.getElementById(`${id}-option-${selectedIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [id, selectedIndex]);
  if (query === null || members.length === 0) return null;

  return (
    <div id={id} role="listbox" aria-label="Mention suggestions" className="absolute bottom-full left-0 mb-2 w-64 max-w-full max-h-[min(12rem,40dvh)] overflow-y-auto bg-card border border-border rounded-panel z-50 py-1 animate-in fade-in zoom-in-95 duration-200 shadow-panel">
      {members.map((user, idx) => (
        <Button variant="unstyled" type="button" role="option" id={`${id}-option-${idx}`} aria-selected={idx === selectedIndex} tabIndex={-1} onMouseDown={event => event.preventDefault()}
          key={user.id}
          onClick={(e) => {
            e.preventDefault();
            onSelect(user);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
            idx === selectedIndex
              ? "bg-info-soft text-info-content"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-info-soft flex items-center justify-center text-info-content font-medium text-xs flex-shrink-0 overflow-hidden">
            {user.id === "all" ? (
              <Users size={15} className="text-info-content" />
            ) : user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={15} className="text-muted-foreground" />
            )}
          </div>
          <span className="truncate">{user.name}</span>
        </Button>
      ))}
    </div>
  );
});
