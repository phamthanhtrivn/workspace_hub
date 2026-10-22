"use client";

import { ChevronRight, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { readableTextOnColor } from "@/lib/color";
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
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
        isDrawerOpen && "bg-muted",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="h-4.5 w-4.5 cursor-pointer rounded-[5px] border bg-card transition-all focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          borderColor: "var(--input)",
          backgroundColor: selected ? color : "var(--card)",
          color: readableTextOnColor(color),
        }}
        aria-label={label}
      />

      <Button
        type="button"
        variant="ghost"
        onClick={onOpenDrawer}
        className="group/task-trigger -my-1 flex h-auto min-w-0 flex-1 cursor-pointer items-center justify-start gap-2.5 rounded-control py-1 pr-1 pl-0 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Open tasks"
      >
        <ListTodo className="h-4 w-4 shrink-0" style={{ color }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground select-none group-hover:text-foreground">
          {label}
        </span>
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition group-hover/task-trigger:translate-x-0.5 group-hover/task-trigger:bg-info-soft group-hover/task-trigger:text-info-content group-focus-visible/task-trigger:bg-info-soft group-focus-visible/task-trigger:text-info-content",
            isDrawerOpen && "bg-info-soft text-info-content rotate-90",
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
