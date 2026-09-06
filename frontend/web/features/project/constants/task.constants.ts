import { TaskPriority, TaskStatus, TaskType } from "../types/project";

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, labelId: "project.task.status.todo" },
  { value: TaskStatus.IN_PROGRESS, labelId: "project.task.status.inProgress" },
  { value: TaskStatus.IN_REVIEW, labelId: "project.task.status.inReview" },
  { value: TaskStatus.DONE, labelId: "project.task.status.done" },
  { value: TaskStatus.CANCELLED, labelId: "project.task.status.cancelled" },
] as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "To Do",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.IN_REVIEW]: "In Review",
  [TaskStatus.DONE]: "Done",
  [TaskStatus.CANCELLED]: "Đã hủy",
};

export const TASK_STATUS_SELECT_OPTIONS = [
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.DONE, label: "Done" },
  { value: TaskStatus.CANCELLED, label: "Đã hủy" },
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, labelId: "project.task.priority.low" },
  { value: TaskPriority.MEDIUM, labelId: "project.task.priority.medium" },
  { value: TaskPriority.HIGH, labelId: "project.task.priority.high" },
  { value: TaskPriority.URGENT, labelId: "project.task.priority.urgent" },
] as const;

export const TASK_DRAWER_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "TO DO", color: "text-[#42526E] bg-[#DFE1E6] hover:bg-[#C1C7D0]" },
  { value: TaskStatus.IN_PROGRESS, label: "IN PROGRESS", color: "text-[#0747A6] bg-[#DEEBFF] hover:bg-[#B3D4FF]" },
  { value: TaskStatus.IN_REVIEW, label: "IN REVIEW", color: "text-[#A54800] bg-[#FFF0B3] hover:bg-[#FFE380]" },
  { value: TaskStatus.DONE, label: "DONE", color: "text-[#006644] bg-[#E3FCEF] hover:bg-[#ABF5D1]" },
  { value: TaskStatus.CANCELLED, label: "ĐÃ HỦY", color: "text-slate-600 bg-slate-200 hover:bg-slate-300" },
] as const;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: "Khẩn cấp",
  [TaskPriority.HIGH]: "Cao",
  [TaskPriority.MEDIUM]: "Trung bình",
  [TaskPriority.LOW]: "Thấp",
};

export const TASK_PRIORITY_SELECT_OPTIONS = [
  { value: TaskPriority.URGENT, label: "Khẩn cấp" },
  { value: TaskPriority.HIGH, label: "Cao" },
  { value: TaskPriority.MEDIUM, label: "Trung bình" },
  { value: TaskPriority.LOW, label: "Thấp" },
] as const;

export const TASK_DRAWER_PRIORITY_OPTIONS = Object.entries(
  TASK_PRIORITY_LABELS,
).map(([value, label]) => ({ value: value as TaskPriority, label }));

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.TASK]: "Task",
  [TaskType.BUG]: "Bug",
  [TaskType.STORY]: "Story",
  [TaskType.EPIC]: "Epic",
  [TaskType.SUBTASK]: "Subtask",
};

export const TASK_TYPE_SELECT_OPTIONS = [
  { value: TaskType.TASK, label: "Task" },
  { value: TaskType.BUG, label: "Bug" },
  { value: TaskType.STORY, label: "Story" },
  { value: TaskType.EPIC, label: "Epic" },
  { value: TaskType.SUBTASK, label: "Subtask" },
] as const;

export const TASK_KIND_FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả phân loại" },
  { value: "PARENT", label: "Chỉ task cha" },
  { value: "TASK", label: "Task thông thường" },
  { value: "SUBTASK", label: "Subtask" },
] as const;

export const TASK_KIND_QUICK_FILTER_OPTIONS = [
  { value: "ALL", label: "Yêu cầu" },
  { value: "PARENT", label: "Task cha" },
  { value: "TASK", label: "Task thường" },
  { value: "SUBTASK", label: "Subtask" },
] as const;

export const TASK_FILTER_LABELS = {
  STATUS_ALL: "Trạng thái",
  PRIORITY_ALL: "Độ ưu tiên",
  ASSIGNEE_ALL: "Người thực hiện",
  ASSIGNEE_UNASSIGNED: "Chưa giao",
  SPRINT_SELECT: "Chọn Sprint...",
} as const;

export const TASK_ASSIGNEE_FILTER_OPTIONS = [
  { value: "", label: TASK_FILTER_LABELS.ASSIGNEE_ALL },
  { value: "UNASSIGNED", label: TASK_FILTER_LABELS.ASSIGNEE_UNASSIGNED },
] as const;

export const TASK_STATUS_CHART_CONFIG = [
  { status: TaskStatus.TODO, label: "To Do", color: "#4C9AFF" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "#0052CC" },
  { status: TaskStatus.IN_REVIEW, label: "In Review", color: "#FFAB00" },
  { status: TaskStatus.DONE, label: "Done", color: "#36B37E" },
  { status: TaskStatus.CANCELLED, label: "Đã hủy", color: "#64748B" },
] as const;

export const TASK_PRIORITY_CHART_CONFIG = [
  { priority: TaskPriority.URGENT, label: "Urgent", color: "bg-red-500" },
  { priority: TaskPriority.HIGH, label: "High", color: "bg-orange-400" },
  { priority: TaskPriority.MEDIUM, label: "Medium", color: "bg-blue-500" },
  { priority: TaskPriority.LOW, label: "Low", color: "bg-slate-400" },
] as const;

export const GANTT_STATUS_LEGEND = [
  { status: TaskStatus.TODO, label: "To Do", color: "bg-slate-400" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "bg-blue-600" },
  { status: TaskStatus.DONE, label: "Done", color: "bg-emerald-500" },
] as const;

export const TASK_STATUS_COLORS: Record<
  TaskStatus,
  {
    label: string;
    bg: string;
    dot: string;
    text: string;
    bar: string;
  }
> = {
  [TaskStatus.TODO]: {
    label: "To Do",
    bg: "bg-[#DFE1E6]",
    dot: "bg-slate-400",
    text: "text-[#42526E]",
    bar: "bg-slate-400",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    bg: "bg-[#DEEBFF]",
    dot: "bg-blue-600",
    text: "text-[#0747A6]",
    bar: "bg-blue-600",
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    bg: "bg-[#FFF0B3]",
    dot: "bg-amber-500",
    text: "text-[#A54800]",
    bar: "bg-amber-500",
  },
  [TaskStatus.DONE]: {
    label: "Done",
    bg: "bg-[#E3FCEF]",
    dot: "bg-emerald-500",
    text: "text-[#006644]",
    bar: "bg-emerald-500",
  },
  [TaskStatus.CANCELLED]: {
    label: "Đã hủy",
    bg: "bg-slate-200",
    dot: "bg-slate-500",
    text: "text-slate-600",
    bar: "bg-slate-500",
  },
};

