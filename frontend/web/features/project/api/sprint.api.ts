import { api } from "@/lib/axios";
import { SprintStatus, type Sprint } from "@/features/project/types/project";
import { normalizeTask, type TaskApiModel } from "./task.api";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface SprintApiModel {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tasks: TaskApiModel[];
}

export interface CreateSprintPayload {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export type UpdateSprintPayload = CreateSprintPayload;

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success)
    throw new Error(response.data.message || "Sprint API request failed");
  return response.data.data;
}

function normalizeSprint(sprint: SprintApiModel): Sprint {
  return {
    id: sprint.id,
    projectId: sprint.projectId,
    name: sprint.name,
    goal: sprint.goal || undefined,
    status: sprint.status,
    startDate: sprint.startDate || undefined,
    endDate: sprint.endDate || undefined,
    startedAt: sprint.startedAt || undefined,
    completedAt: sprint.completedAt || undefined,
    createdBy: sprint.createdBy,
    createdAt: sprint.createdAt,
    updatedAt: sprint.updatedAt,
    tasks: (sprint.tasks || []).map(normalizeTask),
  };
}

export async function getProjectSprints(projectId: string): Promise<Sprint[]> {
  const response = await api.get<ApiResponse<SprintApiModel[]>>(
    `/api/projects/${projectId}/sprints`,
  );
  return (unwrap(response) || []).map(normalizeSprint);
}

export async function createSprint(
  projectId: string,
  payload: CreateSprintPayload,
): Promise<Sprint> {
  const response = await api.post<ApiResponse<SprintApiModel>>(
    `/api/projects/${projectId}/sprints`,
    payload,
  );
  return normalizeSprint(unwrap(response));
}

export async function updateSprint(
  sprintId: string,
  payload: UpdateSprintPayload,
): Promise<Sprint> {
  const response = await api.patch<ApiResponse<SprintApiModel>>(
    `/api/sprints/${sprintId}`,
    payload,
  );
  return normalizeSprint(unwrap(response));
}

export async function addTasksToSprint(
  sprintId: string,
  taskIds: string[],
): Promise<Sprint> {
  const response = await api.post<ApiResponse<SprintApiModel>>(
    `/api/sprints/${sprintId}/tasks`,
    { taskIds },
  );
  return normalizeSprint(unwrap(response));
}

export async function removeTaskFromSprint(
  sprintId: string,
  taskId: string,
): Promise<Sprint> {
  const response = await api.delete<ApiResponse<SprintApiModel>>(
    `/api/sprints/${sprintId}/tasks/${taskId}`,
  );
  return normalizeSprint(unwrap(response));
}

export async function startSprint(sprintId: string): Promise<Sprint> {
  const response = await api.patch<ApiResponse<SprintApiModel>>(
    `/api/sprints/${sprintId}/start`,
  );
  return normalizeSprint(unwrap(response));
}

export async function completeSprint(sprintId: string): Promise<Sprint> {
  const response = await api.patch<ApiResponse<SprintApiModel>>(
    `/api/sprints/${sprintId}/complete`,
  );
  return normalizeSprint(unwrap(response));
}

export async function reopenSprint(sprintId: string): Promise<Sprint> {
  const response = await api.patch<ApiResponse<SprintApiModel>>(
    `/api/sprints/${sprintId}/reopen`,
  );
  return normalizeSprint(unwrap(response));
}
