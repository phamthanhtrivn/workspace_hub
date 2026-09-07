import { api } from "@/lib/axios";
import { type TaskComment } from "@/features/project/types/project";
import { fetchAllPages, type PaginationMeta } from "./pagination";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta | null;
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

interface UserProfileApiModel {
  id: string;
  fullName?: string | null;
  avatarUrl?: string | null;
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

function normalizeComment(
  comment: TaskCommentApiModel,
  profile?: UserProfileApiModel,
): TaskComment {
  const now = new Date().toISOString();
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    authorName: profile?.fullName?.trim() || "Người dùng",
    authorAvatar: profile?.avatarUrl || undefined,
    content: comment.content,
    edited: comment.edited,
    createdAt: comment.createdAt || now,
    updatedAt: comment.updatedAt || comment.createdAt || now,
  };
}

async function hydrateCommentAuthors(
  comments: TaskCommentApiModel[],
): Promise<TaskComment[]> {
  if (comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((comment) => comment.authorId))];
  let profilesById = new Map<string, UserProfileApiModel>();

  try {
    const response = await api.get<ApiResponse<UserProfileApiModel[]>>(
      "/api/users/profiles/bulk",
      { params: { ids: authorIds.join(",") } },
    );
    profilesById = new Map(
      (unwrap(response) || []).map((profile) => [profile.id, profile]),
    );
  } catch {
    // Comments remain usable when profile enrichment is unavailable.
  }

  return comments.map((comment) =>
    normalizeComment(comment, profilesById.get(comment.authorId)),
  );
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const comments = await fetchAllPages(async (page, limit) => {
    const response = await api.get<ApiResponse<TaskCommentApiModel[]>>(
      `/api/tasks/${taskId}/comments`,
      { params: { page, limit } },
    );
    return { items: unwrap(response) || [], meta: response.data.meta };
  });
  return hydrateCommentAuthors(comments);
}

export async function createTaskComment(
  taskId: string,
  payload: CreateTaskCommentPayload,
): Promise<TaskComment> {
  const response = await api.post<ApiResponse<TaskCommentApiModel>>(
    `/api/tasks/${taskId}/comments`,
    payload,
  );
  const [comment] = await hydrateCommentAuthors([unwrap(response)]);
  return comment;
}

export async function updateTaskComment(
  commentId: string,
  payload: UpdateTaskCommentPayload,
): Promise<TaskComment> {
  const response = await api.patch<ApiResponse<TaskCommentApiModel>>(
    `/api/task-comments/${commentId}`,
    payload,
  );
  const [comment] = await hydrateCommentAuthors([unwrap(response)]);
  return comment;
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  await api.delete(`/api/task-comments/${commentId}`);
}
