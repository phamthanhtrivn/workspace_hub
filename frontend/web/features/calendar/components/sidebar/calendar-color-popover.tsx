"use client";

import { Check, MoreVertical, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CALENDAR_COLOR_CHOICES } from "../../types/calendar.constants";

export function CalendarColorPopover({
  value,
  label,
  pending = false,
  onChange,
}: {
  value: string;
  label: string;
  pending?: boolean;
  onChange: (color: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectColor = (color: string) => {
    void Promise.resolve(onChange(color)).finally(() => setOpen(false));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-[calc(100%+0.1rem)] z-30 w-[12.5rem] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.2)]"
        >
          <div className="grid grid-cols-6 gap-2">
            {CALENDAR_COLOR_CHOICES.map((color) => (
              <button
                key={color}
                type="button"
                disabled={pending}
                onClick={() => selectColor(color)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full ring-1 ring-black/5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-60"
                style={{ backgroundColor: color }}
                aria-label={color}
              >
                {value.toLowerCase() === color.toLowerCase() && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </button>
            ))}
            <label className="relative grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
              <Plus className="h-3.5 w-3.5" />
              <input
                type="color"
                defaultValue={value}
                disabled={pending}
                onChange={(event) => selectColor(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={label}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
