"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { TaskLabel } from "@/features/project/types/project";
import { PROJECT_SETTINGS_LABELS } from "@/features/project/constants/project.constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { cn } from "@/lib/utils";

interface LabelDraft {
  name: string;
  color: string;
}

interface ProjectLabelManagerProps {
  labels?: TaskLabel[];
  onCreateLabel?: (payload: { name: string; color: string }) => Promise<void>;
  onUpdateLabel?: (
    labelId: string,
    payload: { name: string; color: string },
  ) => Promise<void>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}

function LabelColorSwatches({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {PROJECT_SETTINGS_LABELS.COLOR_OPTIONS.map((color, index) => {
        const isSelected = value === color;
        const colorLabel = `${label} ${index + 1}: ${color}`;

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
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "h-7 w-7 cursor-pointer rounded-lg border-2 p-0 transition duration-150 active:scale-95 disabled:cursor-default disabled:opacity-60",
              isSelected
                ? "border-white ring-2 ring-[#0052CC] ring-offset-1 hover:border-white"
                : "border-white ring-1 ring-slate-300 hover:scale-105",
            )}
            style={{ backgroundColor: color }}
          >
            {isSelected ? (
              <Check
                aria-hidden="true"
                className="h-3.5 w-3.5 text-white drop-shadow-sm"
                strokeWidth={3}
              />
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}

export function ProjectLabelManager({
  labels = [],
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}: ProjectLabelManagerProps) {
  const [newLabel, setNewLabel] = useState<LabelDraft>({
    name: "",
    color: PROJECT_SETTINGS_LABELS.DEFAULT_LABEL_COLOR,
  });
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<LabelDraft>({
    name: "",
    color: PROJECT_SETTINGS_LABELS.DEFAULT_LABEL_COLOR,
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const { dialogProps, confirm } = useProjectConfirmDialog();
  const canManageLabels = Boolean(
    onCreateLabel || onUpdateLabel || onDeleteLabel,
  );
  const isBusy = Boolean(busyAction);

  const startEdit = (label: TaskLabel) => {
    setEditingLabelId(label.id);
    setEditingLabel({ name: label.name, color: label.color });
  };

  const cancelEdit = () => {
    setEditingLabelId(null);
    setEditingLabel({
      name: "",
      color: PROJECT_SETTINGS_LABELS.DEFAULT_LABEL_COLOR,
    });
  };

  const handleCreateLabel = async () => {
    const nextName = newLabel.name.trim();
    if (!nextName || !onCreateLabel || isBusy) return;

    setBusyAction("create");
    try {
      await onCreateLabel({ name: nextName, color: newLabel.color });
      setNewLabel({
        name: "",
        color: PROJECT_SETTINGS_LABELS.DEFAULT_LABEL_COLOR,
      });
    } catch {
      return;
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpdateLabel = async (labelId: string) => {
    const nextName = editingLabel.name.trim();
    if (!nextName || !onUpdateLabel || isBusy) return;

    setBusyAction(`update-${labelId}`);
    try {
      await onUpdateLabel(labelId, {
        name: nextName,
        color: editingLabel.color,
      });
      cancelEdit();
    } catch {
      return;
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteClick = (label: TaskLabel) => {
    if (!onDeleteLabel || isBusy) return;
    confirm({
      title: "Delete Label",
      description: `Are you sure you want to delete the label "${label.name}"? It will be removed from all associated tasks.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        setBusyAction(`delete-${label.id}`);
        try {
          await onDeleteLabel(label.id);
          if (editingLabelId === label.id) cancelEdit();
        } finally {
          setBusyAction(null);
        }
      },
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-xs font-bold text-slate-700">Project Labels</p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          Create reusable task labels for this project.
        </p>
      </div>

      <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
        {labels.map((label) => {
          const isEditing = editingLabelId === label.id;
          const updateDisabled =
            !editingLabel.name.trim() || busyAction === `update-${label.id}`;

          return (
            <div
              key={label.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingLabel.name}
                      onChange={(event) =>
                        setEditingLabel((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void handleUpdateLabel(label.id);
                      }}
                      maxLength={PROJECT_SETTINGS_LABELS.LABEL_MAX_LENGTH}
                      disabled={isBusy}
                      className="h-8 min-w-0 flex-1 rounded-lg border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={updateDisabled || isBusy}
                      onClick={() => void handleUpdateLabel(label.id)}
                      className="h-8 w-8 cursor-pointer rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-default disabled:opacity-50"
                      aria-label={`Save label ${label.name}`}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isBusy}
                      onClick={cancelEdit}
                      className="h-8 w-8 cursor-pointer rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:opacity-50"
                      aria-label="Cancel label edit"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <LabelColorSwatches
                    value={editingLabel.color}
                    onChange={(color) =>
                      setEditingLabel((current) => ({ ...current, color }))
                    }
                    disabled={isBusy}
                    label={`Select color for ${label.name}`}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5 truncate rounded-full border-transparent px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: label.color }}
                    title={label.name}
                  >
                    <span className="truncate">{label.name}</span>
                  </Badge>
                  {canManageLabels ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {onUpdateLabel ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          onClick={() => startEdit(label)}
                          className="h-7 w-7 cursor-pointer rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:opacity-50"
                          aria-label={`Edit label ${label.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {onDeleteLabel ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          onClick={() => handleDeleteClick(label)}
                          className="h-7 w-7 cursor-pointer rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-default disabled:opacity-50"
                          aria-label={`Delete label ${label.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
        {labels.length === 0 ? (
          <span className="block text-xs font-medium text-slate-400">
            No custom labels created yet.
          </span>
        ) : null}
      </div>

      {onCreateLabel ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2">
            <Input
              value={newLabel.name}
              onChange={(event) =>
                setNewLabel((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void handleCreateLabel();
              }}
              placeholder="Label name..."
              maxLength={PROJECT_SETTINGS_LABELS.LABEL_MAX_LENGTH}
              disabled={isBusy}
              className="h-9 min-w-0 flex-1 rounded-xl border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
            />
            <Button
              type="button"
              onClick={() => void handleCreateLabel()}
              disabled={!newLabel.name.trim() || isBusy}
              className="h-9 cursor-pointer rounded-xl bg-[#0052CC] px-4 text-xs font-bold text-white hover:bg-[#0747A6] disabled:cursor-default disabled:opacity-50"
            >
              Add
            </Button>
          </div>

          <div className="mt-3">
            <LabelColorSwatches
              value={newLabel.color}
              onChange={(color) =>
                setNewLabel((current) => ({ ...current, color }))
              }
              disabled={isBusy}
              label="Select new label color"
            />
          </div>
        </div>
      ) : null}

      <ProjectConfirmDialog {...dialogProps} />
    </div>
  );
}
