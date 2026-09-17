"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { TaskLabel } from "@/features/project/types/project";
import { PROJECT_SETTINGS_LABELS } from "@/features/project/constants/project.constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { cn } from "@/lib/utils";

interface ProjectLabelManagerProps {
  labels?: TaskLabel[];
  onCreateLabel?: (payload: { name: string; color: string }) => Promise<void>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}

export function ProjectLabelManager({
  labels = [],
  onCreateLabel,
  onDeleteLabel,
}: ProjectLabelManagerProps) {
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState<string>(
    PROJECT_SETTINGS_LABELS.DEFAULT_LABEL_COLOR,
  );
  const { dialogProps, confirm } = useProjectConfirmDialog();

  const handleCreateLabel = async () => {
    if (!labelName.trim() || !onCreateLabel) return;
    await onCreateLabel({ name: labelName.trim(), color: labelColor });
    setLabelName("");
  };

  const handleDeleteClick = (label: TaskLabel) => {
    if (!onDeleteLabel) return;
    confirm({
      title: "Delete Label",
      description: `Are you sure you want to delete the label "${label.name}"? It will be removed from all associated tasks.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
      onConfirm: () => onDeleteLabel(label.id),
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-700">
        Project Labels
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <Badge
            key={label.id}
            variant="outline"
            className="inline-flex items-center gap-1.5 rounded-full border-transparent px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            {onDeleteLabel && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(label)}
                className="h-3.5 w-3.5 p-0 cursor-pointer text-white/80 hover:bg-transparent hover:text-white transition-opacity ml-0.5"
                aria-label={`Delete label ${label.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
        {labels.length === 0 && (
          <span className="text-xs text-slate-400 font-medium">
            No custom labels created yet.
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <Input
            value={labelName}
            onChange={(event) => setLabelName(event.target.value)}
            placeholder="Label name..."
            maxLength={PROJECT_SETTINGS_LABELS.LABEL_MAX_LENGTH}
            className="h-9 min-w-0 flex-1 rounded-xl border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
          />
          <Button
            type="button"
            onClick={() => void handleCreateLabel()}
            disabled={!labelName.trim()}
            className="h-9 cursor-pointer rounded-xl bg-[#0052CC] px-4 text-xs font-bold text-white hover:bg-[#0747A6] disabled:opacity-50"
          >
            Add
          </Button>
        </div>

        <div
          role="radiogroup"
          aria-label="Select label color"
          className="mt-3 flex flex-wrap gap-2"
        >
          {PROJECT_SETTINGS_LABELS.COLOR_OPTIONS.map((color, index) => {
            const isSelected = labelColor === color;
            const colorLabel = `Color ${index + 1}: ${color}`;

            return (
              <Button
                key={color}
                type="button"
                variant="ghost"
                size="icon"
                role="radio"
                aria-checked={isSelected}
                aria-label={colorLabel}
                title={colorLabel}
                onClick={() => setLabelColor(color)}
                className={cn(
                  "h-7 w-7 p-0 cursor-pointer rounded-lg border-2 transition duration-150 active:scale-95",
                  isSelected
                    ? "border-white ring-2 ring-[#0052CC] ring-offset-1 hover:border-white"
                    : "border-white ring-1 ring-slate-300 hover:scale-105"
                )}
                style={{ backgroundColor: color }}
              >
                {isSelected && (
                  <Check
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-white drop-shadow-sm"
                    strokeWidth={3}
                  />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <ProjectConfirmDialog {...dialogProps} />
    </div>
  );
}
