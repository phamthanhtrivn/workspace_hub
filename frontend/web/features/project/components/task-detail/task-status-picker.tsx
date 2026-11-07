"use client";
import { useId as useControlledPopupId } from "react";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TaskStatus, isTerminalTaskStatus, type Task } from "@/features/project/types/project";
import { TASK_DRAWER_STATUS_OPTIONS, TASK_STATUS_RESTRICTIONS } from "@/features/project/constants/task.constants";
import { getTaskStatusTransitionReason } from "../../task-status-transition";

import { Button } from "@/components/ui/button";
import { PERMISSION_REASON } from "@/lib/permission-feedback";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface TaskStatusPickerProps {
  task: Task;
  tasks?: Task[];
  onChange: (status: TaskStatus) => Promise<void> | void;
  disabled?: boolean;
}

export default function TaskStatusPicker({
  task,
  tasks = [],
  onChange,
  disabled = false,
}: TaskStatusPickerProps) {
  const controlledPopupId = useControlledPopupId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const status = task.status;
  const disabledReason = disabled
    ? task.archived ? TASK_STATUS_RESTRICTIONS.archived
      : isTerminalTaskStatus(status) ? TASK_STATUS_RESTRICTIONS.readOnly : PERMISSION_REASON.projectContribute
    : undefined;



  const currentOption =
    TASK_DRAWER_STATUS_OPTIONS.find((opt) => opt.value === status) ||
    TASK_DRAWER_STATUS_OPTIONS[0];

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button aria-expanded={isOpen} aria-controls={`${controlledPopupId}-isOpen`} aria-haspopup="menu"
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        disabledReason={disabledReason}
        className={[
          "flex h-7 items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-semibold transition border border-transparent hover:opacity-90",
          currentOption.color,
          disabled ? "cursor-default opacity-80" : "cursor-pointer",
        ].join(" ")}
      >
        <span>{currentOption.label}</span>
        {!disabled && <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {isOpen && !disabled && (
        <AnchoredMenu id={`${controlledPopupId}-isOpen`} onClose={() => setIsOpen(false)} side="bottom" align="start" aria-label="Task status" className="w-40 overflow-hidden rounded-panel border border-border bg-card py-1 z-20 shadow-panel">
          {TASK_DRAWER_STATUS_OPTIONS.map((opt) => (
            <DropdownMenuItem closeOnClick={false}
              key={opt.value}
              disabledReason={getTaskStatusTransitionReason(task, opt.value, tasks)}
              onClick={() => {
                if (getTaskStatusTransitionReason(task, opt.value, tasks)) return;
                setIsOpen(false);
                void onChange(opt.value);
              }}
              className={[
                "flex w-full justify-start rounded-none cursor-pointer items-center px-3 py-2 h-auto text-left text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                opt.value === status
                  ? "text-info-content bg-info-soft/50 hover:bg-info-soft/80 hover:text-info-content"
                  : "text-foreground",
              ].join(" ")}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </AnchoredMenu>
      )}
    </div>
  );
}
