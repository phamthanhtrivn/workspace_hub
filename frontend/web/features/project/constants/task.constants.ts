import { TaskPriority, TaskStatus } from "../types/project";

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.DONE, label: "Done" },
  { value: TaskStatus.CANCELLED, label: "Cancelled" },
] as const;

export const TASK_STATUS_SELECT_OPTIONS = TASK_STATUS_OPTIONS;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: "Urgent",
  [TaskPriority.HIGH]: "High",
  [TaskPriority.MEDIUM]: "Medium",
  [TaskPriority.LOW]: "Low",
};

export const TASK_PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" },
  { value: TaskPriority.URGENT, label: "Urgent" },
] as const;

export const TASK_DRAWER_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "To Do", color: "text-[#42526E] bg-[#DFE1E6] hover:bg-[#C1C7D0]" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress", color: "text-[#0747A6] bg-[#DEEBFF] hover:bg-[#B3D4FF]" },
  { value: TaskStatus.IN_REVIEW, label: "In Review", color: "text-[#A54800] bg-[#FFF0B3] hover:bg-[#FFE380]" },
  { value: TaskStatus.DONE, label: "Done", color: "text-[#006644] bg-[#E3FCEF] hover:bg-[#ABF5D1]" },
  { value: TaskStatus.CANCELLED, label: "Cancelled", color: "text-red-700 bg-red-50 hover:bg-red-100 border border-red-200" },
] as const;

export const TASK_PRIORITY_SELECT_OPTIONS = TASK_PRIORITY_OPTIONS;
export const TASK_DRAWER_PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS;

export const TASK_STATUS_CHART_CONFIG = [
  { status: TaskStatus.TODO, label: "To Do", color: "#4C9AFF" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "#0052CC" },
  { status: TaskStatus.IN_REVIEW, label: "In Review", color: "#FFAB00" },
  { status: TaskStatus.DONE, label: "Done", color: "#36B37E" },
  { status: TaskStatus.CANCELLED, label: "Cancelled", color: "#EF4444" },
] as const;

export const TASK_PRIORITY_CHART_CONFIG = [
  { priority: TaskPriority.URGENT, label: "Urgent", color: "bg-red-500" },
  { priority: TaskPriority.HIGH, label: "High", color: "bg-orange-400" },
  { priority: TaskPriority.MEDIUM, label: "Medium", color: "bg-blue-500" },
  { priority: TaskPriority.LOW, label: "Low", color: "bg-slate-400" },
] as const;

export const GANTT_STATUS_LEGEND = [
  { status: TaskStatus.TODO, label: "To Do", color: "bg-slate-500" },
  { status: TaskStatus.IN_PROGRESS, label: "In Progress", color: "bg-[#0052CC]" },
  { status: TaskStatus.IN_REVIEW, label: "In Review", color: "bg-amber-500" },
  { status: TaskStatus.DONE, label: "Done", color: "bg-emerald-500" },
  { status: TaskStatus.CANCELLED, label: "Cancelled", color: "bg-red-500" },
] as const;
