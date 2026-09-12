import { ProjectStatus, ProjectTemplate } from "../types/project";

export const PROJECT_FILTER_TABS = [
  { key: "ALL", labelId: "project.list.filter.all" },
  { key: ProjectStatus.ACTIVE, labelId: "project.status.active" },
  { key: ProjectStatus.ON_HOLD, labelId: "project.status.onHold" },
  { key: ProjectStatus.COMPLETED, labelId: "project.status.completed" },
] as const;

export const PROJECT_STATUS_SELECT_OPTIONS = [
  { value: ProjectStatus.ACTIVE, labelId: "project.status.active" },
  { value: ProjectStatus.ON_HOLD, labelId: "project.status.onHold" },
  { value: ProjectStatus.COMPLETED, labelId: "project.status.completed" },
] as const;

export const PROJECT_TEMPLATE_OPTIONS = [
  { value: ProjectTemplate.EMPTY, labelId: "project.template.empty" },
  {
    value: ProjectTemplate.SOFTWARE_SCRUM,
    labelId: "project.template.softwareScrum",
    softwareOnly: true,
  },
  {
    value: ProjectTemplate.MARKETING_CAMPAIGN,
    labelId: "project.template.marketingCampaign",
  },
  { value: ProjectTemplate.EVENT_PLAN, labelId: "project.template.eventPlan" },
] as const;

export const DEFAULT_PROJECT_KEY = "PRJ";
export const MAX_PROJECT_KEY_LENGTH = 4;

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
