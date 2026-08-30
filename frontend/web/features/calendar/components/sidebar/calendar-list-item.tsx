"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useUpdateCalendar } from "../../hooks/use-calendar-queries";
import { WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarColorPopover } from "./calendar-color-popover";

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
}: {
  calendar: WorkspaceCalendar;
  selected: boolean;
  onToggle: () => void;
}) {
  const intl = useAppIntl();
  const updateCalendar = useUpdateCalendar();

  const changeColor = async (color: string) => {
    if (color === calendar.color) return;

    try {
      await updateCalendar.mutateAsync({
        calendarId: calendar.id,
        payload: { color },
      });
    } catch {
      toast.error(intl.formatMessage({ id: "calendar.calendarUpdateFailed" }));
    }
  };

  return (
    <div className="relative flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50">
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

      <CalendarColorPopover
        value={calendar.color}
        label={intl.formatMessage({ id: "calendar.color" })}
        pending={updateCalendar.isPending}
        onChange={changeColor}
      />
    </div>
  );
}
