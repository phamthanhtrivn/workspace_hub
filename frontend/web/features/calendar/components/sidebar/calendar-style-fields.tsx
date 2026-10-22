"use client";
import { CustomColorPicker } from "@/components/ui/custom/custom-color-picker";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_ICON_CHOICES,
} from "../../types/calendar.constants";
import { cn } from "@/lib/utils";

export function CalendarIconPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
  compact?: boolean;
}) {


  return (
    <div
      className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          onChange(null);
        }}
        className={cn(
          "grid cursor-pointer place-items-center rounded-control text-sm transition-all",
          compact ? "h-8 w-8" : "h-9 w-9",
          value === null
            ? "bg-primary-soft text-primary-soft-foreground ring-2 ring-ring/30 ring-offset-1"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-muted-foreground",
        )}
        aria-label="No icon"
      >
        <Ban className="h-4 w-4" />
      </Button>

      {CALENDAR_ICON_CHOICES.map((icon) => (
        <Button
          key={icon}
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            onChange(icon);
          }}
          className={cn(
            "grid cursor-pointer place-items-center rounded-control text-base transition-all",
            compact ? "h-8 w-8" : "h-9 w-9",
            value === icon
              ? "bg-info-soft text-info-content ring-2 ring-ring ring-offset-1"
              : "bg-muted hover:bg-accent/80",
          )}
          aria-label={icon}
        >
          {icon}
        </Button>
      ))}
    </div>
  );
}

export function CalendarColorPicker({ value, compact = false, onChange, onShowCustomColor }: {
  value: string; showCustomColor: boolean; compact?: boolean;
  onChange: (color: string) => void; onShowCustomColor: (show: boolean) => void;
}) {
  return <CustomColorPicker value={value} options={CALENDAR_COLOR_CHOICES} ariaLabel="Calendar color"
    className={compact ? "grid grid-cols-5" : "grid grid-cols-6"}
    onChange={(color) => { onChange(color); onShowCustomColor(!CALENDAR_COLOR_CHOICES.some((choice) => choice === color)); }} />;
}
