import type { UpdateTaskPayload } from "../api/task.api";
import type {
  ProjectMember,
  Task,
  TaskChecklist,
  TaskDependency,
  TaskLabel,
} from "./project";

export type TaskDrawerUpdatePayload = UpdateTaskPayload & {
  assignees?: Task["assignees"];
  assigneeUserId?: string | null;
};

export interface TaskDetailDrawerProps {
  task: Task | null;
  tasks?: Task[];
  members?: ProjectMember[];
  project?: unknown;
  onClose: () => void;
  onOpenChat?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onUpdateTask?: (taskId: string, payload: TaskDrawerUpdatePayload) => Promise<void>;
  onCreateSubtask?: (task: Task) => void;
  onCreateChecklist?: (taskId: string, title: string) => Promise<TaskChecklist>;
  onUpdateChecklist?: (checklistId: string, completed: boolean) => Promise<TaskChecklist>;
  onDeleteChecklist?: (checklistId: string) => Promise<void>;
  labels?: TaskLabel[];
  onToggleLabel?: (taskId: string, labelId: string, attached: boolean) => Promise<void>;
  dependencies?: TaskDependency[];
  onCreateDependency?: (successorTaskId: string, predecessorTaskId: string) => Promise<void>;
  onDeleteDependency?: (successorTaskId: string, predecessorTaskId: string) => Promise<void>;
  canEditTask?: boolean;
}
