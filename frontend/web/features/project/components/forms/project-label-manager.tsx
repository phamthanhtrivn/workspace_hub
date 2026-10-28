"use client";
import { CustomColorPicker } from "@/components/ui/custom/custom-color-picker";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { TaskLabel } from "@/features/project/types/project";
import { PROJECT_SETTINGS_LABELS } from "@/features/project/constants/project.constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { readableTextOnColor } from "@/lib/color";

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

function LabelColorSwatches({ value, onChange, disabled = false, label }: {
  value: string; onChange: (color: string) => void; disabled?: boolean; label: string;
}) {
  return <CustomColorPicker value={value} options={PROJECT_SETTINGS_LABELS.COLOR_OPTIONS} onChange={onChange} disabled={disabled} ariaLabel={label} allowCustom={false} />;
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
    <div className="rounded-panel border border-border bg-background p-4">
      <div>
        <p className="text-xs font-semibold text-foreground">Project Labels</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
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
              className="rounded-lg border border-border bg-card px-3 py-2"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input aria-label="Label name"
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
                      className="h-8 min-w-0 flex-1 rounded-control border-input bg-card px-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground"
                    />
                    <Button loading={busyAction === `update-${label.id}`}
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={updateDisabled || isBusy}
                      onClick={() => void handleUpdateLabel(label.id)}
                      className="h-8 w-8 cursor-pointer rounded-control text-success-content hover:bg-success-soft hover:text-success-content disabled:cursor-default disabled:opacity-50"
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
                      className="h-8 w-8 cursor-pointer rounded-control text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-50"
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
                    className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5 truncate rounded-full border-transparent px-2.5 py-0.5 text-xs font-semibold text-primary-foreground"
                    style={{ backgroundColor: label.color, color: readableTextOnColor(label.color) }}
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
                          className="h-7 w-7 cursor-pointer rounded-control text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-50"
                          aria-label={`Edit label ${label.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {onDeleteLabel ? (
                        <Button loading={busyAction === `delete-${label.id}`}
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          onClick={() => handleDeleteClick(label)}
                          className="h-7 w-7 cursor-pointer rounded-control text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content disabled:cursor-default disabled:opacity-50"
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
          <span className="block text-xs font-medium text-muted-foreground">
            No custom labels created yet.
          </span>
        ) : null}
      </div>

      {onCreateLabel ? (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Input aria-label="Label name"
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
              className="h-9 min-w-0 flex-1 rounded-control border-input bg-card px-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground"
            />
            <Button loading={busyAction === "create"}
              type="button"
              onClick={() => void handleCreateLabel()}
              disabled={!newLabel.name.trim() || isBusy}
              className="h-9 cursor-pointer rounded-control bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-default disabled:opacity-50"
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
