"use client";

import { useState } from "react";
import { type Task } from "@/types/project";
import { TaskStatusBadge, TaskPriorityBadge, LabelBadge } from "./status-badge";
import { Avatar } from "./avatar-stack";
import {
  X,
  Calendar,
  Clock,
  User,
  Tag,
  CheckSquare,
  MessageSquare,
  History,
  FileText,
  ArrowRight,
  Send,
} from "lucide-react";

const TABS = [
  { key: "description", label: "Mô tả", icon: FileText },
  { key: "checklist", label: "Checklist", icon: CheckSquare },
  { key: "comments", label: "Bình luận", icon: MessageSquare },
  { key: "activity", label: "Lịch sử", icon: History },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function TaskDetailDrawer({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [newComment, setNewComment] = useState("");

  if (!task) return null;

  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.completed).length;
  const checklistProgress =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-tight text-[var(--color-primary-dark)]">
              {task.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              {task.labels.map((label) => (
                <LabelBadge
                  key={label.id}
                  name={label.name}
                  color={label.color}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        </div>

        {/* ── Metadata sidebar (horizontal) ── */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-4">
          {/* Assignees */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Assignees
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {task.assignees.length > 0 ? (
                task.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5">
                    <Avatar
                      user={{
                        userId: a.userId,
                        displayName: a.displayName,
                        avatarUrl: a.avatarUrl,
                      }}
                      size="xs"
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      {a.displayName}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400">Chưa gán</span>
              )}
            </div>
          </div>

          {/* Due date */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Due Date
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
              <span className="text-xs font-semibold text-slate-600">
                {task.dueDate
                  ? formatDateTime(task.dueDate)
                  : "Chưa đặt"}
              </span>
            </div>
          </div>

          {/* Estimated time */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Estimated
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
              <span className="text-xs font-semibold text-slate-600">
                {task.estimatedMinutes > 0
                  ? task.estimatedMinutes >= 60
                    ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60}m`
                    : `${task.estimatedMinutes}m`
                  : "—"}
              </span>
            </div>
          </div>

          {/* Created */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Created
            </p>
            <div className="mt-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {formatDateTime(task.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 border-b border-slate-100 px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            let count: number | undefined;
            if (tab.key === "checklist") count = checklistTotal;
            if (tab.key === "comments") count = task.comments.length;
            if (tab.key === "activity") count = task.activities.length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-bold transition",
                  isActive
                    ? "border-[var(--color-primary-dark)] text-[var(--color-primary-dark)]"
                    : "border-transparent text-slate-400 hover:text-slate-600",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={[
                      "grid h-4.5 min-w-4.5 place-items-center rounded-md px-1 text-[9px] font-black",
                      isActive
                        ? "bg-[var(--color-primary-dark)] text-white"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Description tab */}
          {activeTab === "description" && (
            <div>
              {task.description ? (
                <div className="prose prose-sm max-w-none text-slate-600">
                  <p className="whitespace-pre-wrap">{task.description}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold text-slate-400">
                    Chưa có mô tả
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Thêm mô tả chi tiết cho task này.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Checklist tab */}
          {activeTab === "checklist" && (
            <div>
              {checklistTotal > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>
                      Tiến độ: {checklistDone}/{checklistTotal}
                    </span>
                    <span>{checklistProgress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {task.checklists.map((item) => (
                  <label
                    key={item.id}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50",
                      item.completed ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="h-4 w-4 rounded-md border-slate-300 text-emerald-500 accent-emerald-500"
                    />
                    <span
                      className={[
                        "text-sm font-semibold",
                        item.completed
                          ? "text-slate-400 line-through"
                          : "text-slate-700",
                      ].join(" ")}
                    >
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
              {checklistTotal === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckSquare className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold text-slate-400">
                    Chưa có checklist
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comments tab */}
          {activeTab === "comments" && (
            <div>
              <div className="space-y-4">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar
                      user={{
                        userId: comment.authorId,
                        displayName: comment.authorName,
                        avatarUrl: comment.authorAvatar,
                      }}
                      size="sm"
                    />
                    <div className="flex-1 rounded-xl bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--color-primary-dark)]">
                          {comment.authorName}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {formatRelative(comment.createdAt)}
                          {comment.edited && " (đã sửa)"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {task.comments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold text-slate-400">
                    Chưa có bình luận
                  </p>
                </div>
              )}

              {/* New comment input */}
              <div className="mt-4 flex gap-3">
                <Avatar
                  user={{ userId: "u-1", displayName: "Thanh Trí" }}
                  size="sm"
                />
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Viết bình luận..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm font-semibold text-[var(--color-primary-dark)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:bg-white focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--color-secondary)] transition hover:bg-[var(--color-secondary)]/10"
                  >
                    <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activity tab */}
          {activeTab === "activity" && (
            <div>
              {task.activities.length > 0 ? (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />

                  {task.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 py-3"
                    >
                      <div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white ring-1 ring-slate-200">
                        <History className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-slate-600">
                          <span className="font-black text-[var(--color-primary-dark)]">
                            {activity.actorName}
                          </span>{" "}
                          đã thay đổi{" "}
                          <span className="font-bold text-slate-700">
                            {activity.field}
                          </span>
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs font-semibold">
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-500">
                            {activity.oldValue}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" strokeWidth={2} />
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-600">
                            {activity.newValue}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {formatRelative(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-semibold text-slate-400">
                    Chưa có hoạt động nào
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
