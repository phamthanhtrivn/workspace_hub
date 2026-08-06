import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTaskComment,
  deleteTaskComment,
  getTaskComments,
  updateTaskComment,
  type CreateTaskCommentPayload,
  type UpdateTaskCommentPayload,
} from "../api/comment.api";

export const commentKeys = {
  task: (taskId: string) => ["tasks", taskId, "comments"] as const,
};

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: commentKeys.task(taskId),
    queryFn: () => getTaskComments(taskId),
    enabled: Boolean(taskId),
  });
}

export function useCreateTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskCommentPayload) =>
      createTaskComment(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.task(taskId) });
    },
  });
}

export function useUpdateTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      payload,
    }: {
      commentId: string;
      payload: UpdateTaskCommentPayload;
    }) => updateTaskComment(commentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.task(taskId) });
    },
  });
}

export function useDeleteTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.task(taskId) });
    },
  });
}
