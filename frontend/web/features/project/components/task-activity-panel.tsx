"use client";

import { ArrowRight, History } from "lucide-react";
import type {
  ProjectMember,
  Task,
  TaskActivity,
} from "@/features/project/types/project";
import {
  ACTIVITY_ACTION_LABELS,
  createTaskActivityPresenter,
} from "@/features/project/task-activity-presenter";

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
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function TaskActivityPanel({
  activities,
  tasks,
  members,
  isLoading,
  isError,
  onRefresh,
}: {
  activities: TaskActivity[];
  tasks: Task[];
  members: ProjectMember[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}) {
  const { activityActor, activityValue } = createTaskActivityPresenter(
    members,
    tasks,
  );

  return (
    <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#172B4D]">Nhật ký hoạt động</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Các thay đổi mới nhất của công việc này.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="shrink-0 rounded px-2 py-1 text-[10px] font-bold text-[#0052CC] hover:bg-blue-50"
        >
          Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="Đang tải nhật ký">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex animate-pulse gap-3">
              <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded border border-red-100 bg-red-50 px-4 py-5 text-center">
          <p className="text-xs font-semibold text-red-700">
            Không thể tải nhật ký hoạt động.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-2 text-[11px] font-bold text-red-700 underline"
          >
            Thử lại
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
          <History className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Chưa có hoạt động nào được ghi nhận.
          </p>
        </div>
      ) : (
        <div>
          {activities.map((activity, index) => {
            const oldValue = activityValue(activity, activity.oldValue);
            const newValue = activityValue(activity, activity.newValue);
            return (
              <article key={activity.id} className="relative flex gap-3 pb-5">
                {index < activities.length - 1 && (
                  <span className="absolute bottom-0 left-3.5 top-7 w-px bg-slate-200" />
                )}
                <span className="relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-[#0052CC]">
                  <History className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs leading-5 text-slate-700">
                      <strong className="font-bold text-[#172B4D]">
                        {activityActor(activity)}
                      </strong>{" "}
                      {ACTIVITY_ACTION_LABELS[activity.field] ||
                        `Đã thay đổi ${activity.field}`}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      title={formatDateTime(activity.createdAt)}
                      className="shrink-0 pt-0.5 text-[9px] font-semibold text-slate-400"
                    >
                      {formatRelative(activity.createdAt)}
                    </time>
                  </div>
                  {(oldValue || newValue) && (
                    <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-slate-500">
                      {oldValue && (
                        <span className="min-w-0 break-words rounded bg-slate-100 px-1.5 py-1">
                          {oldValue}
                        </span>
                      )}
                      {oldValue && newValue && (
                        <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
                      )}
                      {newValue && (
                        <span className="min-w-0 break-words rounded bg-blue-50 px-1.5 py-1 text-blue-700">
                          {newValue}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
