"use client";

import { Check, ListTodo } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarColorPopover } from "./calendar-color-popover";

export function TasksCalendarListItem({
  selected,
  color,
  onToggle,
  onColorChange,
}: {
  selected: boolean;
  color: string;
  onToggle: () => void;
  onColorChange: (color: string) => void;
}) {
  const intl = useAppIntl();
  const label = intl.formatMessage({ id: "calendar.tasks" });

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        className="grid h-5 w-5 cursor-pointer place-items-center rounded border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        style={{
          borderColor: color,
          backgroundColor: selected ? color : "#ffffff",
        }}
        aria-label={label}
        aria-pressed={selected}
      >
        {selected && <Check className="h-3 w-3 text-white" />}
      </button>

      <ListTodo className="h-4 w-4 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
        {label}
      </span>
      <CalendarColorPopover
        value={color}
        label={intl.formatMessage({ id: "calendar.color" })}
        onChange={onColorChange}
      />
    </div>
  );
}
