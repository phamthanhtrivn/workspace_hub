"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Tag } from "lucide-react";
import type { TaskLabel } from "../types/project";
import { LabelBadge } from "./status-badge";

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
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-default disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-500"
          title="Gắn nhãn"
        >
          <Tag className="h-3.5 w-3.5" />
          {taskLabels.length > 0 ? `${taskLabels.length} nhãn` : "Gắn nhãn"}
          {!disabled && <ChevronDown className="h-3 w-3" />}
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
            {availableLabels.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-slate-400">
                Project chưa có nhãn.
              </p>
            ) : (
              availableLabels.map((label) => {
                const attached = taskLabels.some(
                  (item) => item.id === label.id,
                );
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => void onToggleLabel(label)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                  >
                    <span
                      className={`grid h-3.5 w-3.5 place-items-center rounded border ${
                        attached
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {attached && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <LabelBadge name={label.name} color={label.color} />
                  </button>
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
