import { TaskPriority, TaskStatus, TaskType } from "../types/project";

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, labelId: "project.task.status.todo" },
  { value: TaskStatus.IN_PROGRESS, labelId: "project.task.status.inProgress" },
  { value: TaskStatus.IN_REVIEW, labelId: "project.task.status.inReview" },
  { value: TaskStatus.DONE, labelId: "project.task.status.done" },
  { value: TaskStatus.CANCELLED, labelId: "project.task.status.cancelled" },
] as const;

export const TASK_STATUS_LABEL_IDS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "project.task.status.todo",
  [TaskStatus.IN_PROGRESS]: "project.task.status.inProgress",
  [TaskStatus.IN_REVIEW]: "project.task.status.inReview",
  [TaskStatus.DONE]: "project.task.status.done",
  [TaskStatus.CANCELLED]: "project.task.status.cancelled",
};

export const TASK_STATUS_SELECT_OPTIONS = TASK_STATUS_OPTIONS;

export const TASK_PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, labelId: "project.task.priority.low" },
  { value: TaskPriority.MEDIUM, labelId: "project.task.priority.medium" },
  { value: TaskPriority.HIGH, labelId: "project.task.priority.high" },
  { value: TaskPriority.URGENT, labelId: "project.task.priority.urgent" },
] as const;

export const TASK_DRAWER_STATUS_OPTIONS = [
  { value: TaskStatus.TODO, labelId: "project.task.status.todo", color: "text-[#42526E] bg-[#DFE1E6] hover:bg-[#C1C7D0]" },
  { value: TaskStatus.IN_PROGRESS, labelId: "project.task.status.inProgress", color: "text-[#0747A6] bg-[#DEEBFF] hover:bg-[#B3D4FF]" },
  { value: TaskStatus.IN_REVIEW, labelId: "project.task.status.inReview", color: "text-[#A54800] bg-[#FFF0B3] hover:bg-[#FFE380]" },
  { value: TaskStatus.DONE, labelId: "project.task.status.done", color: "text-[#006644] bg-[#E3FCEF] hover:bg-[#ABF5D1]" },
  { value: TaskStatus.CANCELLED, labelId: "project.task.status.cancelled", color: "text-slate-600 bg-slate-200 hover:bg-slate-300" },
] as const;

export const TASK_PRIORITY_LABEL_IDS: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: "project.task.priority.urgent",
  [TaskPriority.HIGH]: "project.task.priority.high",
  [TaskPriority.MEDIUM]: "project.task.priority.medium",
  [TaskPriority.LOW]: "project.task.priority.low",
};

export const TASK_PRIORITY_SELECT_OPTIONS = TASK_PRIORITY_OPTIONS;

export const TASK_DRAWER_PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS;

export const TASK_TYPE_LABEL_IDS: Record<TaskType, string> = {
  [TaskType.TASK]: "project.task.type.task",
  [TaskType.BUG]: "project.task.type.bug",
  [TaskType.STORY]: "project.task.type.story",
  [TaskType.EPIC]: "project.task.type.epic",
  [TaskType.SUBTASK]: "project.task.type.subtask",
};

export const TASK_TYPE_SELECT_OPTIONS = [
  { value: TaskType.TASK, labelId: "project.task.type.task" },
  { value: TaskType.BUG, labelId: "project.task.type.bug" },
  { value: TaskType.STORY, labelId: "project.task.type.story" },
  { value: TaskType.EPIC, labelId: "project.task.type.epic" },
  { value: TaskType.SUBTASK, labelId: "project.task.type.subtask" },
] as const;

export const TASK_FILTER_LABELS = {
  STATUS_ALL: "project.task.status",
  PRIORITY_ALL: "project.task.priority",
  ASSIGNEE_ALL: "project.task.assignee",
  ASSIGNEE_UNASSIGNED: "project.task.unassigned",
  SPRINT_SELECT: "project.sprint.select",
} as const;

export const TASK_ASSIGNEE_FILTER_OPTIONS = [
  { value: "", labelId: TASK_FILTER_LABELS.ASSIGNEE_ALL },
  { value: "UNASSIGNED", labelId: TASK_FILTER_LABELS.ASSIGNEE_UNASSIGNED },
] as const;

export const TASK_STATUS_CHART_CONFIG = [
  { status: TaskStatus.TODO, labelId: "project.task.status.todo", color: "#4C9AFF" },
  { status: TaskStatus.IN_PROGRESS, labelId: "project.task.status.inProgress", color: "#0052CC" },
  { status: TaskStatus.IN_REVIEW, labelId: "project.task.status.inReview", color: "#FFAB00" },
  { status: TaskStatus.DONE, labelId: "project.task.status.done", color: "#36B37E" },
  { status: TaskStatus.CANCELLED, labelId: "project.task.status.cancelled", color: "#64748B" },
] as const;

export const TASK_PRIORITY_CHART_CONFIG = [
  { priority: TaskPriority.URGENT, labelId: "project.task.priority.urgent", color: "bg-red-500" },
  { priority: TaskPriority.HIGH, labelId: "project.task.priority.high", color: "bg-orange-400" },
  { priority: TaskPriority.MEDIUM, labelId: "project.task.priority.medium", color: "bg-blue-500" },
  { priority: TaskPriority.LOW, labelId: "project.task.priority.low", color: "bg-slate-400" },
] as const;

export const GANTT_STATUS_LEGEND = [
  { status: TaskStatus.TODO, labelId: "project.task.status.todo", color: "bg-slate-400" },
  { status: TaskStatus.IN_PROGRESS, labelId: "project.task.status.inProgress", color: "bg-blue-600" },
  { status: TaskStatus.DONE, labelId: "project.task.status.done", color: "bg-emerald-500" },
] as const;

export const TASK_STATUS_COLORS: Record<
  TaskStatus,
  {
    labelId: string;
    bg: string;
    dot: string;
    text: string;
    bar: string;
  }
> = {
  [TaskStatus.TODO]: {
    labelId: "project.task.status.todo",
    bg: "bg-[#DFE1E6]",
    dot: "bg-slate-400",
    text: "text-[#42526E]",
    bar: "bg-slate-400",
  },
  [TaskStatus.IN_PROGRESS]: {
    labelId: "project.task.status.inProgress",
    bg: "bg-[#DEEBFF]",
    dot: "bg-blue-600",
    text: "text-[#0747A6]",
    bar: "bg-blue-600",
  },
  [TaskStatus.IN_REVIEW]: {
    labelId: "project.task.status.inReview",
    bg: "bg-[#FFF0B3]",
    dot: "bg-amber-500",
    text: "text-[#A54800]",
    bar: "bg-amber-500",
  },
  [TaskStatus.DONE]: {
    labelId: "project.task.status.done",
    bg: "bg-[#E3FCEF]",
    dot: "bg-emerald-500",
    text: "text-[#006644]",
    bar: "bg-emerald-500",
  },
  [TaskStatus.CANCELLED]: {
    labelId: "project.task.status.cancelled",
    bg: "bg-slate-200",
    dot: "bg-slate-500",
    text: "text-slate-600",
    bar: "bg-slate-500",
  },
};
