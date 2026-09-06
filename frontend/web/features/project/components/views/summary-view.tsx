"use client";

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ListChecks,
} from "lucide-react";
import {
  isTerminalTaskStatus,
  type ProjectMember,
  type Task,
  type Sprint,
} from "@/features/project/types/project";
import SprintMetricsView from "./sprint-metrics-view";
import {
  ProjectMetricCard,
  ProjectSummaryPanel,
  PriorityDistributionBar,
  MemberWorkloadList,
} from "../summary";

import { useProjectSummaryMetrics } from "@/features/project/hooks/use-project-summary-metrics";

function formatRelative(value?: string): string {
  if (!value) return "Chưa có dữ liệu";
  const minutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function SummaryView({
  tasks,
  members,
  sprints = [],
}: {
  tasks: Task[];
  members: ProjectMember[];
  sprints?: Sprint[];
}) {
  const {
    activeTasks,
    completedRecently,
    updatedRecently,
    createdRecently,
    dueSoon,
    statusItems,
    totalStatus,
    donePercent,
    priorityItems,
    maxPriority,
    typeItems,
    maxType,
    recentTasks,
    workloadItems,
    maxWorkloadItems: maxWorkload,
  } = useProjectSummaryMetrics(tasks, members, { isSoftware: true });

  const sprintItems = activeTasks
    .filter((task) => task.isParentTask)
    .map((sprint) => {
      const children = activeTasks.filter(
        (task) => task.parentTaskId === sprint.id,
      );
      const done = children.filter((task) =>
        isTerminalTaskStatus(task.status),
      ).length;
      return {
        sprint,
        total: children.length,
        done,
        percent: children.length
          ? Math.round((done / children.length) * 100)
          : 0,
      };
    })
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-8">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-sm font-bold text-[#172B4D]">
          Customize your reports to suit your space
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Theo dõi nhanh tiến độ, trạng thái và khối lượng công việc của
          project.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ProjectMetricCard
          icon={CheckCircle2}
          value={completedRecently.length}
          label="Đã hoàn thành"
          sublabel="trong 7 ngày gần nhất"
          color="bg-emerald-50 text-emerald-600"
        />
        <ProjectMetricCard
          icon={Activity}
          value={updatedRecently.length}
          label="Đã cập nhật"
          sublabel="trong 7 ngày gần nhất"
          color="bg-blue-50 text-blue-600"
        />
        <ProjectMetricCard
          icon={ListChecks}
          value={createdRecently.length}
          label="Đã tạo mới"
          sublabel="trong 7 ngày gần nhất"
          color="bg-violet-50 text-violet-600"
        />
        <ProjectMetricCard
          icon={CalendarClock}
          value={dueSoon.length}
          label="Sắp đến hạn"
          sublabel="trong 7 ngày gần nhất"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProjectSummaryPanel
          title="Tổng quan trạng thái"
          description="Snapshot trạng thái của các work items trong project."
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <div
              className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#36B37E ${donePercent}%, #DEEBFF ${donePercent}% 100%)`,
              }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                <div>
                  <p className="text-2xl font-bold text-[#172B4D]">
                    {totalStatus}
                  </p>
                  <p className="text-[11px] text-slate-500">Total work items</p>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs space-y-2">
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
                  <strong className="text-slate-700">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Recent activity"
          description="Những thay đổi gần đây trong project."
        >
          <div className="space-y-3">
            {recentTasks.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">
                Chưa có hoạt động.
              </p>
            )}
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                  <CircleDot className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#172B4D]">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {task.status} ·{" "}
                    {formatRelative(task.updatedAt || task.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Priority breakdown"
          description="Phân bổ mức độ ưu tiên của work items."
        >
          <PriorityDistributionBar
            items={priorityItems}
            maxValue={maxPriority}
          />
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Types of work"
          description="Phân loại công việc trong project."
        >
          <div className="space-y-3">
            {typeItems.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[75px_1fr_28px] items-center gap-3 text-xs"
              >
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                  {item.label}
                </span>
                <div className="h-5 rounded-sm bg-slate-100">
                  <div
                    className="h-5 rounded-sm bg-slate-500"
                    style={{ width: `${(item.value / maxType) * 100}%` }}
                  />
                </div>
                <strong className="text-right text-slate-700">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Team workload"
          description="Theo dõi khối lượng task theo người phụ trách."
        >
          <MemberWorkloadList
            items={workloadItems}
            maxCount={maxWorkload}
            emptyMessage="Chưa có thành viên."
          />
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Sprint progress"
          description="Tiến độ hoàn thành của các task lớn."
        >
          <div className="space-y-4">
            {sprintItems.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">
                Chưa có sprint.
              </p>
            )}
            {sprintItems.map(({ sprint, total, done, percent }) => (
              <div key={sprint.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-semibold text-slate-700">
                    {sprint.title}
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {done}/{total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ProjectSummaryPanel>
      </div>
      <SprintMetricsView sprints={sprints} tasks={activeTasks} />
    </div>
  );
}
