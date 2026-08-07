import { api } from "@/lib/axios";
import type { TaskLabel } from "@/features/project/types/project";
import { type ApiResponse, unwrapApiResponse as unwrap } from "@/lib/api-response";

export interface LabelPayload {
  name: string;
  color?: string;
}

export async function getProjectLabels(
  projectId: string,
): Promise<TaskLabel[]> {
  const response = await api.get<ApiResponse<TaskLabel[]>>(
    `/api/projects/${projectId}/labels`,
  );
  return unwrap(response);
}

export async function createLabel(
  projectId: string,
  payload: LabelPayload,
): Promise<TaskLabel> {
  const response = await api.post<ApiResponse<TaskLabel>>(
    `/api/projects/${projectId}/labels`,
    payload,
  );
  return unwrap(response);
}

export async function updateLabel(
  labelId: string,
  payload: Partial<LabelPayload>,
): Promise<TaskLabel> {
  const response = await api.patch<ApiResponse<TaskLabel>>(
    `/api/labels/${labelId}`,
    payload,
  );
  return unwrap(response);
}

export async function deleteLabel(labelId: string): Promise<void> {
  await api.delete(`/api/labels/${labelId}`);
}

export async function attachLabel(
  taskId: string,
  labelId: string,
): Promise<TaskLabel> {
  const response = await api.post<ApiResponse<TaskLabel>>(
    `/api/tasks/${taskId}/labels/${labelId}`,
  );
  return unwrap(response);
}

export async function detachLabel(
  taskId: string,
  labelId: string,
): Promise<void> {
  await api.delete(`/api/tasks/${taskId}/labels/${labelId}`);
}
