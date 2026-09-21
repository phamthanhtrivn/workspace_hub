"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from "@/features/project/hooks/use-comments";
import type { ProjectMember, Task } from "@/features/project/types/project";
import { Avatar } from "../ui/avatar-stack";
import { ProjectConfirmDialog } from "../ui/project-confirm-dialog";
import { useProjectConfirmDialog } from "@/features/project/hooks/use-project-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatSimpleDate } from "@/features/project/utils/task-dates";

interface TaskCommentsSectionProps {
  task: Task;
  members: ProjectMember[];
  isReadOnly: boolean;
}

export default function TaskCommentsSection({
  task,
  members,
  isReadOnly,
}: TaskCommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const { dialogProps, confirm } = useProjectConfirmDialog();

  const {
    userId: currentUserId,
    fullName: currentUserName,
    avatarUrl: currentUserAvatar,
  } = useAppSelector((state) => state.auth);
  const {
    data: loadedComments,
    isLoading,
    isError,
    refetch,
  } = useTaskComments(task.id);
  const createComment = useCreateTaskComment(task.id);
  const updateComment = useUpdateTaskComment(task.id);
  const deleteComment = useDeleteTaskComment(task.id);

  const comments = (loadedComments ?? task.comments).map((comment) => {
    const author = members.find((member) => member.userId === comment.authorId);
    return author
      ? {
          ...comment,
          authorName: author.displayName,
          authorAvatar: author.avatarUrl || comment.authorAvatar,
        }
      : comment;
  });

  const handleCreate = async () => {
    const content = newComment.trim();
    if (isReadOnly || !content || createComment.isPending) return;
    try {
      await createComment.mutateAsync({ content });
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add comment",
      );
    }
  };

  const handleUpdate = async () => {
    const content = editingComment.trim();
    if (isReadOnly || !editingCommentId || !content) return;
    try {
      await updateComment.mutateAsync({
        commentId: editingCommentId,
        payload: { content },
      });
      setEditingCommentId(null);
      setEditingComment("");
      toast.success("Comment updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update comment",
      );
    }
  };

  const handleDelete = (commentId: string) => {
    if (isReadOnly) return;
    confirm({
      title: "Delete Comment",
      description: "Are you sure you want to delete this comment? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteComment.mutateAsync(commentId);
        toast.success("Comment deleted");
      },
    });
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pb-2 pt-4">
      <h3 className="flex select-none items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <MessageSquare className="h-3.5 w-3.5" />
        Activity Comments ({comments.length})
      </h3>

      {isLoading && (
        <p className="text-xs text-slate-500">
          Loading comments...
        </p>
      )}
      {isError && (
        <p role="alert" className="text-xs text-red-600">
          Could not load comments.{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 underline font-bold cursor-pointer text-red-600 hover:text-red-700"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </p>
      )}
      {comments.length ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar
                user={{
                  userId: comment.authorId,
                  displayName: comment.authorName,
                  avatarUrl: comment.authorAvatar,
                }}
                size="sm"
              />
              <div className="flex-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition hover:bg-slate-100/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172B4D]">
                    {comment.authorName}
                  </span>
                  <div className="flex select-none items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">
                      {formatSimpleDate(comment.createdAt)}
                      {comment.edited && " (edited)"}
                    </span>
                    {currentUserId === comment.authorId && !isReadOnly && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingComment(comment.content);
                          }}
                          className="h-5 w-5 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                          aria-label="Edit comment"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(comment.id)}
                          className="h-5 w-5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {editingCommentId === comment.id && !isReadOnly ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editingComment}
                      onChange={(event) =>
                        setEditingComment(event.target.value)
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border-[#0052CC] p-2 text-xs text-slate-800"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingCommentId(null)}
                        className="h-7 rounded-lg px-2.5 text-[10px] font-bold text-slate-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleUpdate()}
                        disabled={
                          !editingComment.trim() || updateComment.isPending
                        }
                        className="h-7 rounded-lg bg-[#0052CC] px-2.5 text-[10px] font-bold text-white hover:bg-[#0747A6] disabled:opacity-50"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 break-words text-xs leading-relaxed text-[#42526E]">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="select-none rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center text-xs font-semibold text-slate-400">
          No comments yet. Start the conversation below.
        </div>
      )}

      {!isReadOnly && (
        <div className="flex gap-2.5 border-t border-slate-100 pt-3">
          <Avatar
            user={{
              userId: currentUserId || "u-curr",
              displayName: currentUserName || "Me",
              avatarUrl: currentUserAvatar || undefined,
            }}
            size="sm"
          />
          <div className="relative flex-1">
            <Input
              type="text"
              maxLength={10000}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreate();
              }}
              placeholder="Write a comment..."
              aria-label="Write a comment..."
              className="h-10 w-full rounded-xl border-slate-300 bg-white py-2 pl-3 pr-10 text-xs font-semibold text-[#172B4D] placeholder:text-slate-400 focus-visible:border-[#0052CC]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void handleCreate()}
              disabled={!newComment.trim() || createComment.isPending}
              aria-label="Send comment"
              className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer rounded-lg text-[#0052CC] hover:bg-slate-100 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      )}

      <ProjectConfirmDialog {...dialogProps} />
    </div>
  );
}
