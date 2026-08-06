import { api } from "@/lib/axios";
import { type TaskComment } from "@/types/project";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface TaskCommentApiModel {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  edited: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateTaskCommentPayload {
  content: string;
}

export interface UpdateTaskCommentPayload {
  content: string;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || "Comment API request failed");
  }
  return response.data.data;
}

function normalizeComment(comment: TaskCommentApiModel): TaskComment {
  const now = new Date().toISOString();
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    authorName: comment.authorId,
    authorAvatar: undefined,
    content: comment.content,
    edited: comment.edited,
    createdAt: comment.createdAt || now,
    updatedAt: comment.updatedAt || comment.createdAt || now,
  };
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const response = await api.get<ApiResponse<TaskCommentApiModel[]>>(
    `/api/tasks/${taskId}/comments`,
  );
  return (unwrap(response) || []).map(normalizeComment);
}

export async function createTaskComment(
  taskId: string,
  payload: CreateTaskCommentPayload,
): Promise<TaskComment> {
  const response = await api.post<ApiResponse<TaskCommentApiModel>>(
    `/api/tasks/${taskId}/comments`,
    payload,
  );
  return normalizeComment(unwrap(response));
}

export async function updateTaskComment(
  commentId: string,
  payload: UpdateTaskCommentPayload,
): Promise<TaskComment> {
  const response = await api.patch<ApiResponse<TaskCommentApiModel>>(
    `/api/task-comments/${commentId}`,
    payload,
  );
  return normalizeComment(unwrap(response));
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  await api.delete(`/api/task-comments/${commentId}`);
}
