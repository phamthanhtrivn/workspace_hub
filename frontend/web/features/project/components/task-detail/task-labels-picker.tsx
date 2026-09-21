"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Tag } from "lucide-react";
import type { TaskLabel } from "@/features/project/types/project";
import { LabelBadge } from "../ui/status-badge";
import { Button } from "@/components/ui/button";

interface TaskLabelsPickerProps {
  taskLabels: TaskLabel[];
  availableLabels: TaskLabel[];
  onToggleLabel: (label: TaskLabel) => Promise<void> | void;
  disabled?: boolean;
}

export default function TaskLabelsPicker({
  taskLabels,
  availableLabels,
  onToggleLabel,
  disabled = false,
}: TaskLabelsPickerProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-1.5" ref={containerRef}>
      {/* Trigger Button & Dropdown */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          className="h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 text-xs font-semibold text-slate-600 hover:border-[#0052CC] hover:bg-blue-50/50 hover:text-[#0052CC] disabled:cursor-default disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition"
          title="Attach or remove labels"
        >
          <Tag className="h-3.5 w-3.5" />
          {taskLabels.length > 0
            ? `Labels (${taskLabels.length})`
            : "Add Label"}
          {!disabled && <ChevronDown className="h-3 w-3" />}
        </Button>

        {isOpen && !disabled && (
          <div className="absolute left-0 top-full z-30 mt-1 max-h-60 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {availableLabels.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-slate-400">
                No labels configured in project settings.
              </p>
            ) : (
              availableLabels.map((label) => {
                const attached = taskLabels.some(
                  (item) => item.id === label.id,
                );
                return (
                  <Button
                    key={label.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void onToggleLabel(label)}
                    className="flex w-full h-auto justify-start cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 transition"
                  >
                    <span
                      className={`grid h-3.5 w-3.5 place-items-center rounded border ${
                        attached
                          ? "border-[#0052CC] bg-[#0052CC] text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {attached && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <LabelBadge name={label.name} color={label.color} />
                  </Button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Attached labels list */}
      {taskLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {taskLabels.map((label) => (
            <LabelBadge key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}
    </div>
  );
}
