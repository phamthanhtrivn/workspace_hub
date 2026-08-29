"use client";

import { Check, MoreVertical } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { WorkspaceCalendar } from "../../types/calendar.types";

function CalendarSelectionCheckbox({
  calendar,
  selected,
  onToggle,
}: {
  calendar: WorkspaceCalendar;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid h-5 w-5 cursor-pointer place-items-center rounded border"
      style={{
        borderColor: calendar.color,
        backgroundColor: selected ? calendar.color : "#ffffff",
      }}
      aria-label={calendar.name}
    >
      {selected && <Check className="h-3 w-3 text-white" />}
    </button>
  );
}

export function CalendarListItem({
  calendar,
  selected,
  onToggle,
  onOpenSettings,
}: {
  calendar: WorkspaceCalendar;
  selected: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50">
      <CalendarSelectionCheckbox
        calendar={calendar}
        selected={selected}
        onToggle={onToggle}
      />

      {calendar.icon && (
        <span className="shrink-0 text-sm leading-none">{calendar.icon}</span>
      )}

      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
        {calendar.name}
      </span>

      <button
        type="button"
        onClick={onOpenSettings}
        className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={intl.formatMessage({
          id: "calendar.settings",
        })}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
