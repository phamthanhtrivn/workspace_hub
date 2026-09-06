import { useState } from "react";
import type { TaskLabel } from "@/features/project/types/project";
import { PROJECT_SETTINGS_LABELS } from "@/features/project/constants/project.constants";

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

  const handleCreateLabel = async () => {
    if (!labelName.trim() || !onCreateLabel) return;
    await onCreateLabel({ name: labelName.trim(), color: labelColor });
    setLabelName("");
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-600">
        {PROJECT_SETTINGS_LABELS.LABELS_TITLE}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {labels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            {onDeleteLabel && (
              <button
                type="button"
                onClick={() => void onDeleteLabel(label.id)}
                className="opacity-80 hover:opacity-100"
                aria-label={PROJECT_SETTINGS_LABELS.LABEL_DELETE_ARIA(
                  label.name,
                )}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {labels.length === 0 && (
          <span className="text-[11px] text-slate-400">
            {PROJECT_SETTINGS_LABELS.LABELS_EMPTY}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={labelName}
          onChange={(event) => setLabelName(event.target.value)}
          placeholder={PROJECT_SETTINGS_LABELS.LABEL_NAME_PLACEHOLDER}
          maxLength={PROJECT_SETTINGS_LABELS.LABEL_MAX_LENGTH}
          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-600"
        />
        <input
          type="color"
          value={labelColor}
          onChange={(event) => setLabelColor(event.target.value)}
          className="h-8 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
          aria-label={PROJECT_SETTINGS_LABELS.LABEL_COLOR_ARIA}
        />
        <button
          type="button"
          onClick={() => void handleCreateLabel()}
          disabled={!labelName.trim()}
          className="rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {PROJECT_SETTINGS_LABELS.LABEL_ADD_BTN}
        </button>
      </div>
    </div>
  );
}
