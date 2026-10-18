"use client";

import { Check, MoreVertical, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { readableTextOnColor } from "@/lib/color";
import { CALENDAR_COLOR_CHOICES } from "../../types/calendar.constants";
import { AnchoredPopover } from "@/components/ui/anchored-popup";

export function CalendarColorPopover({
  value,
  label,
  pending = false,
  triggerClassName,
  onChange,
}: {
  value: string;
  label: string;
  pending?: boolean;
  triggerClassName?: string;
  onChange: (color: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);



  const selectColor = (color: string) => {
    void Promise.resolve(onChange(color)).finally(() => setOpen(false));
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground transition hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
          open && "!opacity-100 bg-muted text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <AnchoredPopover onClose={() => setOpen(false)} side="bottom" align="end"
          role="dialog"
          aria-label={label}
          className="z-30 w-[12.5rem] max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-card p-3 shadow-panel"
        >
          <div className="grid grid-cols-6 gap-2">
            {CALENDAR_COLOR_CHOICES.map((color) => (
              <Button
                key={color}
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => selectColor(color)}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full ring-1 ring-input transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                style={{ backgroundColor: color, color: readableTextOnColor(color) }}
                aria-label={color}
              >
                {value.toLowerCase() === color.toLowerCase() && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            ))}
            <label className="relative grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-ring transition hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
              <Plus className="h-3.5 w-3.5" />
              <Input
                type="color"
                defaultValue={value}
                disabled={pending}
                onChange={(event) => selectColor(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={label}
              />
            </label>
          </div>
        </AnchoredPopover>
      )}
    </div>
  );
}
