"use client";

import { CustomColorPicker } from "@/components/ui/custom/custom-color-picker";
import { WorkspaceIconPicker } from "@/components/ui/custom/workspace-icon-picker";

export function CalendarIconPicker({
  value,
  onChange,
  compact = false,
  disabled,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <WorkspaceIconPicker
      value={value}
      onChange={onChange}
      compact={compact}
      disabled={disabled}
      allowNone
      ariaLabel="Calendar icon"
    />
  );
}

export function CalendarColorPicker({
  value,
  compact = false,
  onChange,
  disabled,
}: {
  value: string;
  compact?: boolean;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <CustomColorPicker
      value={value}
      ariaLabel="Calendar color"
      disabled={disabled}
      className={compact ? "gap-2" : undefined}
      onChange={onChange}
    />
  );
}
