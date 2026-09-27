"use client";

import { ChevronRight, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { CalendarColorPopover } from "./calendar-color-popover";

export function TasksCalendarListItem({
  selected,
  color,
  isDrawerOpen,
  onToggle,
  onOpenDrawer,
  onColorChange,
}: {
  selected: boolean;
  color: string;
  isDrawerOpen?: boolean;
  onToggle: () => void;
  onOpenDrawer?: () => void;
  onColorChange: (color: string) => void;
}) {

  const label = "Tasks";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100/70",
        isDrawerOpen && "bg-slate-100/90",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="h-4.5 w-4.5 cursor-pointer rounded-[5px] border bg-white transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500/40"
        style={{
          borderColor: color,
          backgroundColor: selected ? color : "#ffffff",
        }}
        aria-label={label}
      />

      <Button
        type="button"
        variant="ghost"
        onClick={onOpenDrawer}
        className="group/task-trigger -my-1 flex h-auto min-w-0 flex-1 cursor-pointer items-center justify-start gap-2.5 rounded-md py-1 pr-1 pl-0 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        title="Open tasks"
      >
        <ListTodo className="h-4 w-4 shrink-0" style={{ color }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 select-none group-hover:text-slate-900">
          {label}
        </span>
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition group-hover/task-trigger:translate-x-0.5 group-hover/task-trigger:bg-blue-100 group-hover/task-trigger:text-blue-700 group-focus-visible/task-trigger:bg-blue-100 group-focus-visible/task-trigger:text-blue-700",
            isDrawerOpen && "bg-blue-100 text-blue-700 rotate-90",
          )}
        >
          <ChevronRight className="h-4 w-4 stroke-[2.5]" />
        </span>
      </Button>

      <CalendarColorPopover
        value={color}
        label="Color"
        onChange={onColorChange}
      />
    </div>
  );
}
