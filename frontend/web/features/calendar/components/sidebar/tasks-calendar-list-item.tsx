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
    <div className="group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100/70">
      <button
        type="button"
        onClick={onToggle}
        className="grid h-4.5 w-4.5 cursor-pointer place-items-center rounded-[5px] border bg-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        style={{
          borderColor: color,
          backgroundColor: selected ? color : "#ffffff",
        }}
        aria-label={label}
        aria-pressed={selected}
      >
        {selected && <Check className="h-3 w-3 stroke-[2.5] text-white" />}
      </button>

      <ListTodo className="h-4 w-4 shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 select-none">
        {label}
      </span>
      <CalendarColorPopover
        value={color}
        label={intl.formatMessage({ id: "calendar.color" })}
        triggerClassName="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        onChange={onColorChange}
      />
    </div>
  );
}
