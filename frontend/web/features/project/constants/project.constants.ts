import { ProjectStatus } from "../types/project";

export const PROJECT_FILTER_TABS = [
  { key: "ALL", label: "All Projects" },
  { key: ProjectStatus.ACTIVE, label: "Active" },
  { key: ProjectStatus.ON_HOLD, label: "On Hold" },
  { key: ProjectStatus.COMPLETED, label: "Completed" },
] as const;

export const PROJECT_STATUS_SELECT_OPTIONS = [
  { value: ProjectStatus.ACTIVE, label: "Active" },
  { value: ProjectStatus.ON_HOLD, label: "On Hold" },
  { value: ProjectStatus.COMPLETED, label: "Completed" },
] as const;

export const PROJECT_SETTINGS_LABELS = {
  DEFAULT_LABEL_COLOR: "#0052CC",
  COLOR_OPTIONS: [
    "#0052CC",
    "#F59E0B",
    "#22C55E",
    "#EF4444",
    "#EC4899",
    "#0EA5E9",
    "#8B5CF6",
    "#14B8A6",
  ],
  LABEL_MAX_LENGTH: 50,
} as const;
