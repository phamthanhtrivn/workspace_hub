import { ProjectStatus, ProjectTemplate } from "../types/project";

export const PROJECT_FILTER_TABS = [
  { key: "ALL", label: "Tất cả dự án" },
  { key: ProjectStatus.ACTIVE, label: "Đang hoạt động" },
  { key: ProjectStatus.ON_HOLD, label: "Tạm dừng" },
  { key: ProjectStatus.COMPLETED, label: "Hoàn thành" },
] as const;

export const PROJECT_STATUS_SELECT_OPTIONS = [
  { value: ProjectStatus.ACTIVE, label: "Đang hoạt động" },
  { value: ProjectStatus.ON_HOLD, label: "Tạm dừng" },
  { value: ProjectStatus.COMPLETED, label: "Hoàn thành" },
] as const;

export const PROJECT_TEMPLATE_OPTIONS = [
  { value: ProjectTemplate.EMPTY, labelId: "project.template.empty" },
  {
    value: ProjectTemplate.SOFTWARE_SCRUM,
    label: "Software Scrum",
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
  TITLE_EDIT: "Cài đặt Project",
  TITLE_LABELS_ONLY: "Nhãn của Project",
  DESC_EDIT: "Cập nhật thông tin, trạng thái và nhãn của Project.",
  DESC_LABELS_ONLY: "Quản lý các nhãn dùng cho công việc trong Project.",
  START_DATE: "Ngày bắt đầu",
  DUE_DATE: "Ngày kết thúc dự kiến",
  DATE_ERROR: "Ngày bắt đầu không được sau ngày kết thúc.",
  NAME: "Tên Project",
  DESCRIPTION: "Mô tả",
  STATUS: "Trạng thái",
  ARCHIVE_BTN: "Archive Project",
  CANCEL_BTN: "Hủy",
  SAVE_BTN: "Lưu thay đổi",
  LABELS_TITLE: "Nhãn của Project",
  LABELS_EMPTY: "Chưa có label.",
  LABEL_NAME_PLACEHOLDER: "Tên label",
  LABEL_COLOR_ARIA: "Màu label",
  LABEL_ADD_BTN: "Thêm",
  LABEL_DELETE_ARIA: (name: string) => `Xóa ${name}`,
  DEFAULT_LABEL_COLOR: "#0052CC",
  LABEL_MAX_LENGTH: 50,
} as const;
