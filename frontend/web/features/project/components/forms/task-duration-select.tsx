"use client";

import { useState } from "react";
import { ProjectSelect } from "../ui/project-form-controls";
import { Input } from "@/components/ui/input";
import {
  TASK_DURATION_OPTIONS,
  TASK_DURATION_PRESETS,
} from "@/features/project/utils/task-duration.utils";

interface TaskDurationSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  onPresetSelect?: (minutes: number) => void;
  onCustomCommit?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function TaskDurationSelect({
  value,
  onValueChange,
  onPresetSelect,
  onCustomCommit,
  disabled = false,
  compact = false,
}: TaskDurationSelectProps) {
  const minutes = Number(value);
  const [customSelected, setCustomSelected] = useState(
    value !== "" && !TASK_DURATION_PRESETS.some((preset) => preset === minutes),
  );
  const isPreset = TASK_DURATION_PRESETS.some((preset) => preset === minutes);
  const selection = customSelected || (value !== "" && !isPreset)
    ? "custom"
    : value;

  if (compact) {
    return (
      <div className="space-y-1">
        <ProjectSelect
          value={selection}
          options={TASK_DURATION_OPTIONS}
          disabled={disabled}
          onChange={(nextValue) => {
            if (nextValue === "custom") {
              setCustomSelected(true);
              onValueChange(isPreset ? "" : value);
              return;
            }
            setCustomSelected(false);
            onValueChange(nextValue);
            onPresetSelect?.(Number(nextValue));
          }}
          ariaLabel="Estimated duration"
          triggerClassName="h-7 text-xs border-slate-200 shadow-2xs px-2"
        />
        {selection === "custom" && (
          <Input
            type="number"
            min={0}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
            onBlur={onCustomCommit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            placeholder="Minutes..."
            className="h-7 text-xs font-semibold"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ProjectSelect
        value={selection}
        options={TASK_DURATION_OPTIONS}
        disabled={disabled}
        onChange={(nextValue) => {
          if (nextValue === "custom") {
            setCustomSelected(true);
            onValueChange(isPreset ? "" : value);
            return;
          }
          setCustomSelected(false);
          onValueChange(nextValue);
          onPresetSelect?.(Number(nextValue));
        }}
        ariaLabel="Estimated duration"
        className="w-full h-11"
      />

      {selection === "custom" && (
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onCustomCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          placeholder="Enter duration in minutes..."
          className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
          aria-label="Custom duration in minutes"
        />
      )}
    </div>
  );
}
