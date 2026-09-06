"use client";

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ListChecks,
} from "lucide-react";
import {
  type ProjectMember,
  type Task,
} from "@/features/project/types/project";
import { TaskStatusBadge } from "../ui/status-badge";
import {
  ProjectMetricCard,
  ProjectSummaryPanel,
  PriorityDistributionBar,
  MemberWorkloadList,
} from "../summary";

import {
  useProjectSummaryMetrics,
  isWithinLastDays,
} from "@/features/project/hooks/use-project-summary-metrics";

function formatDate(value?: string): string {
  if (!value) return "Chưa đặt";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export default function GeneralSummaryView({
  tasks,
  members,
}: {
  tasks: Task[];
  members: ProjectMember[];
}) {
  const {
    now,
    rootTasks,
    subtasks,
    completed,
    overdue,
    dueSoon,
    unscheduled,
    completionPercent,
    statusItems,
    priorityItems,
    maxPriority,
    recentTasks,
    workload,
    maxWorkload,
  } = useProjectSummaryMetrics(tasks, members, { isSoftware: false });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-8">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-bold text-[#172B4D]">Tổng quan công việc</p>
        <p className="mt-1 text-xs text-slate-600">
          Theo dõi Task và Subtask trực tiếp, không sử dụng Backlog hoặc Sprint.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ProjectMetricCard
          icon={ListChecks}
          value={rootTasks.length}
          label="Task"
          color="bg-blue-50 text-blue-600"
        />
        <ProjectMetricCard
          icon={Activity}
          value={subtasks.length}
          label="Subtask"
          color="bg-violet-50 text-violet-600"
        />
        <ProjectMetricCard
          icon={CheckCircle2}
          value={completed.length}
          label="Đã hoàn thành"
          color="bg-emerald-50 text-emerald-600"
        />
        <ProjectMetricCard
          icon={CircleAlert}
          value={overdue.length}
          label="Đã quá hạn"
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProjectSummaryPanel
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
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
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
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Mức độ ưu tiên"
          description="Phân bổ ưu tiên của Task và Subtask."
        >
          <PriorityDistributionBar
            items={priorityItems}
            maxValue={maxPriority}
          />
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Phân công công việc"
          description="Số lượng task theo người thực hiện."
        >
          <MemberWorkloadList
            items={workload}
            maxCount={maxWorkload}
            barColor="bg-blue-500"
            emptyMessage="Chưa có công việc được phân công."
          />
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
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
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
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
        </ProjectSummaryPanel>
      </div>
    </div>
  );
}
