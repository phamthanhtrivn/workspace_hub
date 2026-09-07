"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { confirmProjectAction } from "../project-alert";
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from "../hooks/use-comments";
import type { ProjectMember, Task } from "../types/project";
import { Avatar } from "./avatar-stack";

interface TaskCommentsSectionProps {
  task: Task;
  members: ProjectMember[];
  isReadOnly: boolean;
}

function formatRelative(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function TaskCommentsSection({
  task,
  members,
  isReadOnly,
}: TaskCommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const { userId: currentUserId } = useAppSelector((state) => state.auth);
  const { data: loadedComments } = useTaskComments(task.id);
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
      toast.success("Đã thêm bình luận");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm bình luận");
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
      toast.success("Đã cập nhật bình luận");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật bình luận");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (isReadOnly) return;
    const confirmed = await confirmProjectAction({
      title: "Xóa bình luận?",
      text: "Nội dung bình luận sẽ không thể khôi phục.",
      confirmText: "Xóa bình luận",
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;
    deleteComment.mutate(commentId, {
      onSuccess: () => toast.success("Đã xóa bình luận"),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Không thể xóa bình luận"),
    });
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pb-2 pt-4">
      <h3 className="flex select-none items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <MessageSquare className="h-3.5 w-3.5" />
        Bình luận ({comments.length})
      </h3>

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
              <div className="flex-1 rounded border border-slate-150 bg-slate-50 p-2.5 transition hover:bg-slate-100/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#172B4D]">
                    {comment.authorName}
                  </span>
                  <div className="flex select-none items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-slate-400">
                      {formatRelative(comment.createdAt)}
                      {comment.edited && " (đã sửa)"}
                    </span>
                    {currentUserId === comment.authorId && !isReadOnly && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingComment(comment.content);
                          }}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(comment.id)}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {editingCommentId === comment.id && !isReadOnly ? (
                  <div className="mt-1.5 space-y-1.5">
                    <textarea
                      value={editingComment}
                      onChange={(event) => setEditingComment(event.target.value)}
                      rows={2}
                      className="w-full resize-none rounded border border-[#0052CC] p-2 text-xs text-slate-700 outline-none"
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCommentId(null)}
                        className="rounded px-2 py-0.5 text-[9px] font-bold text-slate-500 transition hover:bg-slate-200"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUpdate()}
                        disabled={!editingComment.trim() || updateComment.isPending}
                        className="rounded bg-[#0052CC] px-2 py-0.5 text-[9px] font-bold text-white transition disabled:opacity-50"
                      >
                        Lưu
                      </button>
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
        <div className="select-none rounded border border-dashed border-slate-200 bg-slate-50/30 py-6 text-center text-[11px] font-semibold text-slate-400">
          Chưa có bình luận.
        </div>
      )}

      {!isReadOnly && (
        <div className="flex gap-2.5 border-t border-slate-100 pt-2">
          <Avatar user={{ userId: currentUserId || "u-curr", displayName: "Me" }} size="sm" />
          <div className="relative flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreate();
              }}
              placeholder="Viết phản hồi..."
              className="w-full rounded border border-slate-300 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-[#172B4D] outline-none transition placeholder:text-slate-400 focus:border-[#0052CC]"
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!newComment.trim() || createComment.isPending}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[#0052CC] transition hover:bg-slate-100 disabled:opacity-50"
            >
              <Send className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
