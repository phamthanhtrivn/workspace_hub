import { api } from "@/lib/axios";
import {
  TaskPriority,
  TaskStatus,
  type Task,
  type TaskChecklist,
  type TaskAssignee,
  type TaskLabel,
  type TaskActivity,
} from "@/features/project/types/project";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface TaskApiModel {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  childCount?: number;
  isParentTask?: boolean;
  autoCompleteSprint?: boolean;
  sprintId?: string | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string;
  reporterId: string;
  startDate?: string | null;
  dueDate?: string | null;
  allDay: boolean;
  completedAt?: string | null;
  estimatedMinutes: number;
  rank?: string | null;
  archived: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  checklists?: TaskChecklist[];
  assignees?: Array<
    Pick<TaskAssignee, "id" | "taskId" | "userId" | "assignedAt">
  >;
  labels?: TaskLabel[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string;
  dueDate?: string;
  allDay?: boolean;
  estimatedMinutes?: number;
  rank?: string;
  parentTaskId?: string;
  isParentTask?: boolean;
  autoCompleteSprint?: boolean;
  assigneeUserId?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string;
  dueDate?: string;
  allDay?: boolean;
  estimatedMinutes?: number;
  rank?: string;
  archived?: boolean;
  parentTaskId?: string;
  clearParent?: boolean;
  isParentTask?: boolean;
  autoCompleteSprint?: boolean;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || "Task API request failed");
  }

  return response.data.data;
}

export function normalizeTask(task: TaskApiModel): Task {
  const now = new Date().toISOString();

  return {
    id: task.id,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId || undefined,
    childCount: task.childCount || 0,
    isParentTask: task.isParentTask || false,
    autoCompleteSprint: task.autoCompleteSprint || false,
    sprintId: task.sprintId || undefined,
    title: task.title,
    description: task.description || "",
    priority: task.priority || TaskPriority.MEDIUM,
    status: task.status || TaskStatus.TODO,
    createdBy: task.createdBy,
    reporterId: task.reporterId,
    startDate: task.startDate || undefined,
    dueDate: task.dueDate || undefined,
    allDay: task.allDay,
    completedAt: task.completedAt || undefined,
    estimatedMinutes: task.estimatedMinutes || 0,
    rank: task.rank || "",
    archived: task.archived,
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
    checklists: task.checklists || [],
    assignees: (task.assignees || []).map((assignee) => ({
      ...assignee,
      displayName: "",
    })),
    comments: [],
    activities: [],
    timeTrackings: [],
    labels: task.labels || [],
    pomodoroSessions: [],
  };
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const response = await api.get<ApiResponse<TaskApiModel[]>>(
    `/api/projects/${projectId}/tasks`,
  );
  return (unwrap(response) || []).map(normalizeTask);
}

export async function getTask(taskId: string): Promise<Task> {
  const response = await api.get<ApiResponse<TaskApiModel>>(
    `/api/tasks/${taskId}`,
  );
  return normalizeTask(unwrap(response));
}

export async function createTask(
  projectId: string,
  payload: CreateTaskPayload,
): Promise<Task> {
  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as CreateTaskPayload;

  const response = await api.post<ApiResponse<TaskApiModel>>(
    `/api/projects/${projectId}/tasks`,
    cleanPayload,
  );
  return normalizeTask(unwrap(response));
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const response = await api.patch<ApiResponse<TaskApiModel>>(
    `/api/tasks/${taskId}`,
    payload,
  );
  return normalizeTask(unwrap(response));
}

type ChecklistApiModel = TaskChecklist;

export async function createChecklist(
  taskId: string,
  title: string,
): Promise<TaskChecklist> {
  const response = await api.post<ApiResponse<ChecklistApiModel>>(
    `/api/tasks/${taskId}/checklists`,
    { title },
  );
  return unwrap(response);
}

export async function updateChecklist(
  checklistId: string,
  completed: boolean,
): Promise<TaskChecklist> {
  const response = await api.patch<ApiResponse<ChecklistApiModel>>(
    `/api/checklists/${checklistId}`,
    { completed },
  );
  return unwrap(response);
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  await api.delete(`/api/checklists/${checklistId}`);
}

export async function getTaskActivities(
  taskId: string,
): Promise<TaskActivity[]> {
  const response = await api.get<ApiResponse<TaskActivity[]>>(
    `/api/tasks/${taskId}/activities`,
  );
  return unwrap(response);
}
