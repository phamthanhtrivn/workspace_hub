"use client";

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ListChecks,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
  type Task,
} from "@/features/project/types/project";
import { TaskStatusBadge } from "./status-badge";

const DAY = 24 * 60 * 60 * 1000;

function formatDate(value?: string): string {
  if (!value) return "Chưa đặt";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function isWithinLastDays(
  value: string | undefined,
  referenceTime: number,
  days = 7,
): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= referenceTime - days * DAY && time <= referenceTime;
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-[#172B4D]">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof CheckCircle2;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`grid h-9 w-9 place-items-center rounded-md ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold text-[#172B4D]">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default function GeneralSummaryView({
  tasks,
  members,
}: {
  tasks: Task[];
  members: ProjectMember[];
}) {
  const [now] = useState(() => Date.now());
  const activeTasks = tasks.filter((task) => !task.archived);
  const rootTasks = activeTasks.filter((task) => !task.parentTaskId);
  const subtasks = activeTasks.filter((task) => Boolean(task.parentTaskId));
  const completed = activeTasks.filter(
    (task) => task.status === TaskStatus.DONE,
  );
  const overdue = activeTasks.filter(
    (task) =>
      task.dueDate &&
      task.status !== TaskStatus.DONE &&
      new Date(task.dueDate).getTime() < now,
  );
  const dueSoon = activeTasks
    .filter((task) => {
      if (!task.dueDate || task.status === TaskStatus.DONE) return false;
      const due = new Date(task.dueDate).getTime();
      return due >= now && due <= now + 7 * DAY;
    })
    .sort(
      (a, b) =>
        new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime(),
    );
  const unscheduled = activeTasks.filter(
    (task) => !task.startDate && !task.dueDate,
  );
  const completionPercent = activeTasks.length
    ? Math.round((completed.length / activeTasks.length) * 100)
    : 0;
  const statusItems = [
    {
      label: "To Do",
      value: activeTasks.filter((task) => task.status === TaskStatus.TODO)
        .length,
      color: "#4C9AFF",
    },
    {
      label: "In Progress",
      value: activeTasks.filter(
        (task) => task.status === TaskStatus.IN_PROGRESS,
      ).length,
      color: "#0052CC",
    },
    {
      label: "In Review",
      value: activeTasks.filter((task) => task.status === TaskStatus.IN_REVIEW)
        .length,
      color: "#FFAB00",
    },
    { label: "Done", value: completed.length, color: "#36B37E" },
  ];
  const priorityItems = [
    {
      label: "Urgent",
      value: activeTasks.filter(
        (task) => task.priority === TaskPriority.URGENT,
      ),
      color: "bg-red-500",
    },
    {
      label: "High",
      value: activeTasks.filter((task) => task.priority === TaskPriority.HIGH),
      color: "bg-orange-400",
    },
    {
      label: "Medium",
      value: activeTasks.filter(
        (task) => task.priority === TaskPriority.MEDIUM,
      ),
      color: "bg-blue-500",
    },
    {
      label: "Low",
      value: activeTasks.filter((task) => task.priority === TaskPriority.LOW),
      color: "bg-slate-400",
    },
  ];
  const maxPriority = Math.max(
    1,
    ...priorityItems.map((item) => item.value.length),
  );
  const recentTasks = [...activeTasks]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )
    .slice(0, 5);
  const workload = members
    .map((member) => ({
      name: member.displayName,
      count: activeTasks.filter((task) =>
        task.assignees?.some((assignee) => assignee.userId === member.userId),
      ).length,
    }))
    .filter((item) => item.count > 0);
  const maxWorkload = Math.max(1, ...workload.map((item) => item.count));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-8">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-bold text-[#172B4D]">Tổng quan công việc</p>
        <p className="mt-1 text-xs text-slate-600">
          Theo dõi Task và Subtask trực tiếp, không sử dụng Backlog hoặc Sprint.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          icon={ListChecks}
          value={rootTasks.length}
          label="Task"
          color="bg-blue-50 text-blue-600"
        />
        <Metric
          icon={Activity}
          value={subtasks.length}
          label="Subtask"
          color="bg-violet-50 text-violet-600"
        />
        <Metric
          icon={CheckCircle2}
          value={completed.length}
          label="Đã hoàn thành"
          color="bg-emerald-50 text-emerald-600"
        />
        <Metric
          icon={CircleAlert}
          value={overdue.length}
          label="Đã quá hạn"
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Tiến độ công việc"
          description="Tỷ lệ hoàn thành trên toàn bộ Task và Subtask."
        >
          <div className="flex items-center gap-5">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#36B37E ${completionPercent}%, #E2E8F0 ${completionPercent}% 100%)`,
              }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                <strong className="text-2xl text-[#172B4D]">
                  {completionPercent}%
                </strong>
              </div>
            </div>
            <div className="w-full space-y-2">
              {statusItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Deadline sắp tới"
          description="Các công việc chưa hoàn thành trong 7 ngày tới."
        >
          {dueSoon.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-400">
              Không có deadline sắp tới.
            </p>
          ) : (
            <div className="space-y-2">
              {dueSoon.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded border border-slate-100 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-amber-600">
                    {formatDate(task.dueDate)}
                  </span>
                  <TaskStatusBadge status={task.status} compact />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Mức độ ưu tiên"
          description="Phân bổ ưu tiên của Task và Subtask."
        >
          <div className="space-y-3">
            {priorityItems.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[70px_1fr_28px] items-center gap-3 text-xs"
              >
                <span className="text-slate-600">{item.label}</span>
                <div className="h-5 rounded-sm bg-slate-100">
                  <div
                    className={`h-5 rounded-sm ${item.color}`}
                    style={{
                      width: `${(item.value.length / maxPriority) * 100}%`,
                    }}
                  />
                </div>
                <strong className="text-right">{item.value.length}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Phân công công việc"
          description="Số lượng task theo người thực hiện."
        >
          {workload.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-400">
              Chưa có công việc được phân công.
            </p>
          ) : (
            <div className="space-y-3">
              {workload.map((item) => (
                <div
                  key={item.name}
                  className="grid grid-cols-[120px_1fr_28px] items-center gap-3 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate text-slate-600">
                    <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {item.name}
                  </span>
                  <div className="h-5 rounded-sm bg-slate-100">
                    <div
                      className="h-5 rounded-sm bg-blue-500"
                      style={{ width: `${(item.count / maxWorkload) * 100}%` }}
                    />
                  </div>
                  <strong className="text-right">{item.count}</strong>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Task chưa lên lịch"
          description="Task chưa có ngày bắt đầu hoặc hạn hoàn thành."
        >
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-2xl font-bold text-[#172B4D]">
                {unscheduled.length}
              </p>
              <p className="text-xs text-slate-500">
                công việc cần được lên lịch
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Hoạt động gần đây"
          description="Các task được cập nhật gần nhất."
        >
          {recentTasks.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-400">
              Chưa có hoạt động.
            </p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 border-b border-slate-100 pb-2 last:border-0"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                    {task.title}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {isWithinLastDays(task.updatedAt, now)
                      ? "Mới cập nhật"
                      : formatDate(task.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
