"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TaskStatus } from "@/features/project/types/project";
import { TASK_DRAWER_STATUS_OPTIONS } from "@/features/project/constants/task.constants";

import { Button } from "@/components/ui/button";

interface TaskStatusPickerProps {
  status: TaskStatus;
  onChange: (status: TaskStatus) => Promise<void> | void;
  disabled?: boolean;
}

export default function TaskStatusPicker({
  status,
  onChange,
  disabled = false,
}: TaskStatusPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption =
    TASK_DRAWER_STATUS_OPTIONS.find((opt) => opt.value === status) ||
    TASK_DRAWER_STATUS_OPTIONS[0];

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
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
        <div className="absolute left-0 mt-1 w-40 overflow-hidden rounded-panel border border-border bg-card py-1 z-20 shadow-panel">
          {TASK_DRAWER_STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                void onChange(opt.value);
              }}
              className={[
                "flex w-full justify-start rounded-none cursor-pointer items-center px-3 py-2 h-auto text-left text-xs font-semibold transition hover:bg-muted",
                opt.value === status
                  ? "text-info bg-info-soft/50 hover:bg-info-soft/80 hover:text-info"
                  : "text-foreground",
              ].join(" ")}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
