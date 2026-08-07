import { api } from "@/lib/axios";
import type { TaskDependency } from "@/features/project/types/project";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success)
    throw new Error(response.data.message || "Dependency API request failed");
  return response.data.data;
}

export async function getProjectDependencies(
  projectId: string,
): Promise<TaskDependency[]> {
  return unwrap(
    await api.get<ApiResponse<TaskDependency[]>>(
      `/api/projects/${projectId}/dependencies`,
    ),
  );
}

export async function createTaskDependency(
  successorTaskId: string,
  predecessorTaskId: string,
): Promise<TaskDependency> {
  return unwrap(
    await api.post<ApiResponse<TaskDependency>>(
      `/api/tasks/${successorTaskId}/dependencies`,
      { predecessorTaskId, dependencyType: "FINISH_TO_START" },
    ),
  );
}

export async function deleteTaskDependency(
  successorTaskId: string,
  predecessorTaskId: string,
): Promise<void> {
  await api.delete(
    `/api/tasks/${successorTaskId}/dependencies/${predecessorTaskId}`,
  );
}
