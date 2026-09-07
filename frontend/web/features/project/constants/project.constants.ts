import { ProjectStatus } from "../types/project";

export const PROJECT_FILTER_TABS = [
  { key: "ALL", label: "Tất cả dự án" },
  { key: ProjectStatus.ACTIVE, label: "Đang hoạt động" },
  { key: ProjectStatus.ON_HOLD, label: "Tạm dừng" },
  { key: ProjectStatus.COMPLETED, label: "Hoàn thành" },
] as const;

export const DEFAULT_PROJECT_KEY = "PRJ";
export const MAX_PROJECT_KEY_LENGTH = 4;
