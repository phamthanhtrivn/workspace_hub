"use client";

import { Activity, Gauge } from "lucide-react";
import {
  SprintStatus,
  TaskStatus,
  type Sprint,
  type Task,
} from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function SprintMetricsView({
  sprints,
  tasks,
}: {
  sprints: Sprint[];
  tasks: Task[];
}) {
  const intl = useAppIntl();
  const visibleSprints = sprints
    .filter(
      (sprint) =>
        sprint.status !== SprintStatus.COMPLETED || sprint.tasks.length > 0,
    )
    .slice(0, 4);
  if (visibleSprints.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#172B4D]">
            <Activity className="h-4 w-4 text-blue-600" />{" "}
            {intl.formatMessage({ id: "project.sprint.analytics" })}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {intl.formatMessage({ id: "project.sprint.analyticsDescription" })}
          </p>
        </div>
        <Gauge className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {visibleSprints.map((sprint) => {
          const sprintTasks =
            sprint.tasks.length > 0
              ? sprint.tasks
              : tasks.filter((task) => task.sprintId === sprint.id);
          const total = sprintTasks.length;
          const done = sprintTasks.filter(
            (task) => task.status === TaskStatus.DONE,
          ).length;
          const estimate = sprintTasks.reduce(
            (sum, task) => sum + (task.estimatedMinutes || 0),
            0,
          );
          const remaining = total - done;
          const percent = total ? Math.round((done / total) * 100) : 0;
          const points = Array.from({ length: 7 }, (_, index) => {
            const ideal = total - (total * index) / 6;
            const actual =
              index === 6
                ? remaining
                : Math.min(
                    total,
                    remaining + ((total - remaining) * (6 - index)) / 6,
                  );
            return { ideal, actual };
          });
          const max = Math.max(1, total);
          const polyline = points
            .map(
              (point, index) =>
                `${index * 16.66},${96 - (point.actual / max) * 82}`,
            )
            .join(" ");
          const idealLine = points
            .map(
              (point, index) =>
                `${index * 16.66},${96 - (point.ideal / max) * 82}`,
            )
            .join(" ");

          return (
            <div
              key={sprint.id}
              className="rounded border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-bold text-slate-700">
                  {sprint.name}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-blue-700">
                  {intl.formatMessage(
                    { id: "project.sprint.velocity" },
                    { count: done },
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span>
                  {intl.formatMessage(
                    { id: "project.sprint.doneEstimate" },
                    { done, total, estimate },
                  )}
                </span>
                <span>{percent}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="mt-3 h-24 w-full overflow-visible rounded bg-white ring-1 ring-slate-200"
              >
                <polyline
                  points={idealLine}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
                <span>{intl.formatMessage({ id: "project.sprint.start" })}</span>
                <span>
                  {intl.formatMessage(
                    { id: "project.sprint.remaining" },
                    { count: remaining },
                  )}
                </span>
                <span>{intl.formatMessage({ id: "project.sprint.end" })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
