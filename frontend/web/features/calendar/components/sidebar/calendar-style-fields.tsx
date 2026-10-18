"use client";

import { Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_ICON_CHOICES,
} from "../../types/calendar.constants";
import { cn } from "@/lib/utils";
import { readableTextOnColor } from "@/lib/color";

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

export function CalendarColorPicker({
  value,
  showCustomColor,
  compact = false,
  onChange,
  onShowCustomColor,
}: {
  value: string;
  showCustomColor: boolean;
  compact?: boolean;
  onChange: (color: string) => void;
  onShowCustomColor: (show: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${compact ? "grid-cols-5" : "grid-cols-6"}`}>
        {CALENDAR_COLOR_CHOICES.map((choice) => (
          <Button
            key={choice}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange(choice);
              onShowCustomColor(false);
            }}
            className={cn(
              "grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-border transition-transform",
              value.toLowerCase() === choice.toLowerCase() && !showCustomColor
                ? "ring-2 ring-ring ring-offset-2"
                : "ring-1 ring-ring",
            )}
            style={{ backgroundColor: choice, color: readableTextOnColor(choice) }}
            aria-label={choice}
          >
            {value.toLowerCase() === choice.toLowerCase() &&
              !showCustomColor && (
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              )}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onShowCustomColor(true)}
          className={cn(
            "grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground transition-transform",
            showCustomColor
              ? "ring-2 ring-ring ring-offset-2"
              : "ring-1 ring-ring",
          )}
          aria-label="Custom color"
        >
          +
        </Button>
      </div>

      {showCustomColor && (
        <div className="flex items-center gap-2">
          <Input aria-label="Calendar color"
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-10 cursor-pointer rounded-control border border-input bg-card p-0.5"
          />
          <Input aria-label="Calendar color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 rounded-control border border-input px-3 py-1.5 text-xs font-mono font-medium text-foreground shadow-none outline-none focus-visible:border-info-outline focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
    </div>
  );
}
