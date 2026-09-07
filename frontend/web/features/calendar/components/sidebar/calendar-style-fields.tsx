"use client";

import { Ban, Check } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_ICON_CHOICES,
} from "../../types/calendar.constants";
import { cn } from "@/lib/utils";

export function CalendarIconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => {
          onChange(null);
        }}
        className={cn(
          "grid h-10 w-10 cursor-pointer place-items-center rounded-xl transition",
          value === null
            ? "bg-[var(--color-primary-dark)] text-white shadow-sm ring-2 ring-[var(--color-primary-dark)] ring-offset-2"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
        )}
        aria-label={intl.formatMessage({ id: "calendar.noIcon" })}
      >
        <Ban className="h-4 w-4" />
      </button>

      {CALENDAR_ICON_CHOICES.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => {
            onChange(icon);
          }}
          className={cn(
            "grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-lg transition",
            value === icon
              ? "bg-[var(--color-primary-dark)] shadow-lg ring-2 ring-[var(--color-primary-dark)] ring-offset-2"
              : "bg-slate-100 hover:bg-slate-200",
          )}
          aria-label={icon}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

export function CalendarColorPicker({
  value,
  showCustomColor,
  onChange,
  onShowCustomColor,
}: {
  value: string;
  showCustomColor: boolean;
  onChange: (color: string) => void;
  onShowCustomColor: (show: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2">
        {CALENDAR_COLOR_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => {
              onChange(choice);
              onShowCustomColor(false);
            }}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-white shadow-sm ring-1 ring-slate-200"
            style={{ backgroundColor: choice }}
            aria-label={choice}
          >
            {value === choice && !showCustomColor && (
              <Check className="h-4 w-4 text-white" />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onShowCustomColor(true)}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-500 ring-1 ring-slate-200"
          aria-label="Custom color"
        >
          +
        </button>
      </div>

      {showCustomColor && (
        <div className="flex gap-2">
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1"
          />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />
        </div>
      )}
    </div>
  );
}
