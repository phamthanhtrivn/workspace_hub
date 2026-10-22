"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MEETING_ROOM_REACTIONS } from "../../types/meeting.constants";
import type { MeetingRoomReactionEmoji } from "../../types/meeting.constants";

interface MeetingRoomReactionPickerProps {
  label: string;
  disabled?: boolean;
  onSendReaction: (emoji: MeetingRoomReactionEmoji) => void;
}

export function MeetingRoomReactionPicker({ label, disabled = false, onSendReaction }: MeetingRoomReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  return <DropdownMenu open={isOpen && !disabled} onOpenChange={setIsOpen}>
    <div className="relative shrink-0">
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="unstyled" type="button" disabled={disabled} aria-label={label}
          className="relative flex h-12 w-14 sm:h-[68px] sm:w-[76px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-visible rounded-control bg-accent text-xs font-semibold text-muted-foreground ring-1 ring-border/10 transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
          <SmilePlus className="h-5 w-5" /><span className="max-w-full truncate px-1">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} aria-label={label} className="grid w-[148px] min-w-0 grid-cols-3 gap-1.5 rounded-lg bg-card p-2 ring-1 ring-border/10">
        {MEETING_ROOM_REACTIONS.map((emoji) => <DropdownMenuItem key={emoji} aria-label={label + " " + emoji}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-control px-0 py-0 text-2xl transition hover:bg-accent"
          onClick={() => { onSendReaction(emoji); setIsOpen(false); }}>{emoji}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </div>
  </DropdownMenu>;
}
