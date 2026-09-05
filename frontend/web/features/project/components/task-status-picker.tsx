"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TaskStatus } from "../types/project";
import { TASK_DRAWER_STATUS_OPTIONS } from "../constants/task.constants";

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
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={[
          "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition border border-transparent shadow-sm",
          currentOption.color,
          disabled ? "cursor-default opacity-80" : "cursor-pointer",
        ].join(" ")}
      >
        <span>{currentOption.label}</span>
        {!disabled && <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1 w-40 rounded border border-slate-200 bg-white py-1 shadow-lg z-20">
          {TASK_DRAWER_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setIsOpen(false);
                void onChange(opt.value);
              }}
              className={[
                "flex w-full items-center px-3 py-1.5 text-left text-xs font-bold transition hover:bg-slate-100",
                opt.value === status
                  ? "text-[#0052CC] bg-blue-50/30"
                  : "text-slate-700",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
