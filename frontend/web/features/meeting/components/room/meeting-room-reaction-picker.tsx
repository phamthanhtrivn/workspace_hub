"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEETING_ROOM_REACTIONS } from "../../types/meeting.constants";
import type { MeetingRoomReactionEmoji } from "../../types/meeting.constants";

interface MeetingRoomReactionPickerProps {
  label: string;
  disabled?: boolean;
  onSendReaction: (emoji: MeetingRoomReactionEmoji) => void;
}

interface PickerPosition {
  left: number;
  top: number;
}

const PICKER_WIDTH_PX = 148;
const PICKER_HEIGHT_PX = 102;
const VIEWPORT_GAP_PX = 8;

function clampPickerLeft(left: number) {
  const maxLeft = window.innerWidth - PICKER_WIDTH_PX - VIEWPORT_GAP_PX;
  return Math.max(VIEWPORT_GAP_PX, Math.min(left, maxLeft));
}

export function MeetingRoomReactionPicker({
  label,
  disabled = false,
  onSendReaction,
}: MeetingRoomReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePickerPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const preferredTop =
      buttonRect.top - PICKER_HEIGHT_PX - VIEWPORT_GAP_PX;
    const fallbackTop = buttonRect.bottom + VIEWPORT_GAP_PX;
    const top = preferredTop >= VIEWPORT_GAP_PX ? preferredTop : fallbackTop;

    setPickerPosition({
      left: clampPickerLeft(
        buttonRect.left + buttonRect.width / 2 - PICKER_WIDTH_PX / 2,
      ),
      top: Math.max(VIEWPORT_GAP_PX, top),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePickerPosition();
  }, [isOpen, updatePickerPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [isOpen, updatePickerPosition]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "relative flex h-[68px] w-[76px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-visible rounded-lg bg-white/10 text-[11px] font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <SmilePlus className="h-5 w-5" />
        <span className="max-w-full truncate px-1">{label}</span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[120] grid w-[148px] grid-cols-3 gap-1.5 rounded-lg bg-[#111827] p-2 shadow-xl ring-1 ring-white/10"
              style={{
                left: pickerPosition?.left ?? VIEWPORT_GAP_PX,
                top: pickerPosition?.top ?? VIEWPORT_GAP_PX,
              }}
            >
              {MEETING_ROOM_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
