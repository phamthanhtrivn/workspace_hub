"use client";

import { useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEETING_ROOM_REACTIONS } from "../../types/meeting.constants";
import type { MeetingRoomReactionEmoji } from "../../types/meeting.constants";

interface MeetingRoomReactionPickerProps {
  label: string;
  disabled?: boolean;
  onSendReaction: (emoji: MeetingRoomReactionEmoji) => void;
}

export function MeetingRoomReactionPicker({
  label,
  disabled = false,
  onSendReaction,
}: MeetingRoomReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "relative flex h-[68px] w-[76px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-visible rounded-lg bg-white/10 text-[11px] font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <SmilePlus className="h-5 w-5" />
        <span className="max-w-full truncate px-1">{label}</span>
      </button>

      {isOpen ? (
        <div className="absolute bottom-[76px] left-1/2 z-30 grid -translate-x-1/2 grid-cols-3 gap-1.5 rounded-lg bg-[#111827] p-2 shadow-xl ring-1 ring-white/10">
          {MEETING_ROOM_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-md text-2xl transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={`${label} ${emoji}`}
              onClick={() => {
                onSendReaction(emoji);
                setIsOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
