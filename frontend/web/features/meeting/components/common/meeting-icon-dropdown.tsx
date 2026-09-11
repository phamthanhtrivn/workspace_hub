"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MeetingIconDropdownItem {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface MeetingIconDropdownProps {
  label: string;
  items: MeetingIconDropdownItem[];
}

export function MeetingIconDropdown({ label, items }: MeetingIconDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasEnabledItems = items.some((item) => !item.disabled);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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

  if (items.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        disabled={!hasEnabledItems}
        onClick={() => setIsOpen((current) => !current)}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg bg-[#111827] py-1 shadow-xl ring-1 ring-white/10">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;

                item.onSelect();
                setIsOpen(false);
              }}
              className={`flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                item.danger
                  ? "text-red-200 hover:bg-red-500 hover:text-white"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
