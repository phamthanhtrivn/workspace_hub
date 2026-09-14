"use client";

import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export const TASK_DURATION_PRESETS = [30, 45, 60, 120, 240, 360, 480] as const;

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
  const intl = useAppIntl();
  const minutes = Number(value);
  const [customSelected, setCustomSelected] = useState(
    value !== "" && !TASK_DURATION_PRESETS.some((preset) => preset === minutes),
  );
  const isPreset = TASK_DURATION_PRESETS.some((preset) => preset === minutes);
  const selection = customSelected || (value !== "" && !isPreset)
    ? "custom"
    : value;
  const baseClass = compact
    ? "w-full border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 disabled:cursor-default"
    : "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 disabled:bg-slate-50";

  return (
    <div className="space-y-2">
      <select
        value={selection}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === "custom") {
            setCustomSelected(true);
            onValueChange(isPreset ? "" : value);
            return;
          }
          setCustomSelected(false);
          onValueChange(nextValue);
          onPresetSelect?.(Number(nextValue));
        }}
        className={baseClass}
      >
        <option value="">
          {intl.formatMessage({ id: "project.task.duration.none" })}
        </option>
        {TASK_DURATION_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {intl.formatMessage(
              {
                id: preset < 60
                  ? "project.task.duration.minutes"
                  : "project.task.duration.hours",
              },
              { minutes: preset, hours: preset / 60 },
            )}
          </option>
        ))}
        <option value="custom">
          {intl.formatMessage({ id: "project.task.duration.custom" })}
        </option>
      </select>

      {selection === "custom" && (
        <input
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
          placeholder={intl.formatMessage({ id: "project.task.duration.customPlaceholder" })}
          className={baseClass}
          aria-label={intl.formatMessage({ id: "project.task.duration.custom" })}
        />
      )}
    </div>
  );
}
