export const TASK_DURATION_PRESETS = [30, 45, 60, 120, 240, 360, 480] as const;

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export const TASK_DURATION_OPTIONS = [
  { value: "", label: "No estimate" },
  ...TASK_DURATION_PRESETS.map((preset) => ({
    value: String(preset),
    label: formatDurationLabel(preset),
  })),
  { value: "custom", label: "Custom minutes..." },
];
