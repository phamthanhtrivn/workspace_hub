"use client";

import { Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
          "grid cursor-pointer place-items-center rounded-lg text-sm transition-all active:scale-95",
          compact ? "h-8 w-8" : "h-9 w-9",
          value === null
            ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30 ring-offset-1"
            : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600",
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
            "grid cursor-pointer place-items-center rounded-lg text-base transition-all active:scale-95",
            compact ? "h-8 w-8" : "h-9 w-9",
            value === icon
              ? "bg-blue-50 text-blue-600 shadow-xs ring-2 ring-blue-600 ring-offset-1"
              : "bg-slate-100 hover:bg-slate-200/80",
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
              "grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-white/50 shadow-xs transition-transform hover:scale-110 active:scale-95",
              value.toLowerCase() === choice.toLowerCase() && !showCustomColor
                ? "ring-2 ring-blue-600 ring-offset-2"
                : "ring-1 ring-slate-200",
            )}
            style={{ backgroundColor: choice }}
            aria-label={choice}
          >
            {value.toLowerCase() === choice.toLowerCase() &&
              !showCustomColor && (
                <Check className="h-3.5 w-3.5 stroke-[2.5] text-white drop-shadow-xs" />
              )}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onShowCustomColor(true)}
          className={cn(
            "grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500 transition-transform hover:scale-110 active:scale-95",
            showCustomColor
              ? "ring-2 ring-blue-600 ring-offset-2"
              : "ring-1 ring-slate-200",
          )}
          aria-label="Custom color"
        >
          +
        </Button>
      </div>

      {showCustomColor && (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5 shadow-xs"
          />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-mono font-medium text-slate-700 shadow-none outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
          />
        </div>
      )}
    </div>
  );
}
