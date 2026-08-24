import { TaskPriority, TaskStatus, TaskType } from "../types/project";

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, labelId: "project.task.status.todo" },
  { value: TaskStatus.IN_PROGRESS, labelId: "project.task.status.inProgress" },
  { value: TaskStatus.IN_REVIEW, labelId: "project.task.status.inReview" },
  { value: TaskStatus.DONE, labelId: "project.task.status.done" },
  { value: TaskStatus.CANCELLED, labelId: "project.task.status.cancelled" },
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
