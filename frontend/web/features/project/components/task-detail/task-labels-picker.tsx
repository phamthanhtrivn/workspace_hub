"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Tag } from "lucide-react";
import type { TaskLabel } from "@/features/project/types/project";
import { LabelBadge } from "../ui/status-badge";
import TaskLabelBadges from "../ui/task-label-badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskLabelsPickerProps {
  taskLabels: TaskLabel[];
  availableLabels: TaskLabel[];
  onToggleLabel: (label: TaskLabel) => Promise<void> | void;
  disabled?: boolean;
  showSelectedBadges?: boolean;
}

export default function TaskLabelsPicker({
  taskLabels,
  availableLabels,
  onToggleLabel,
  disabled = false,
  showSelectedBadges = true,
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
          className="h-7 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-input px-2.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:bg-info-soft/50 hover:text-info-content disabled:cursor-default disabled:hover:border-input disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition"
          title="Attach or remove labels"
        >
          <Tag className="h-3.5 w-3.5" />
          {taskLabels.length > 0
            ? `Labels (${taskLabels.length})`
            : "Add Label"}
          {!disabled && <ChevronDown className="h-3 w-3" />}
        </Button>

        {isOpen && !disabled && (
          <div className="absolute left-0 top-full z-30 mt-1 max-h-60 w-56 overflow-y-auto rounded-panel border border-border bg-card p-1.5 shadow-panel">
            {availableLabels.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                No labels configured in project settings.
              </p>
            ) : (
              availableLabels.map((label) => {
                const attached = taskLabels.some(
                  (item) => item.id === label.id,
                );
                return (
                  <div
                    key={label.id}
                    role="menuitemcheckbox"
                    aria-checked={attached}
                    tabIndex={0}
                    onClick={() => void onToggleLabel(label)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      void onToggleLabel(label);
                    }}
                    className="flex h-auto w-full cursor-pointer items-center justify-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-background focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Checkbox
                      checked={attached}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none size-4 border-input data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                    <LabelBadge name={label.name} color={label.color} />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Attached labels list */}
      {showSelectedBadges && taskLabels.length > 0 && (
        <TaskLabelBadges labels={taskLabels} />
      )}
    </div>
  );
}
