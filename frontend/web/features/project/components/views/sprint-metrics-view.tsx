"use client";

import {
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
  if (!sprints.length) return null;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-800">
        {intl.formatMessage({ id: "project.sprint.metricsTitle" })}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {intl.formatMessage({ id: "project.sprint.metricsDescription" })}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {sprints.slice(0, 4).map((sprint) => {
          const current = tasks.filter(
            (task) => task.sprintId === sprint.id && !task.archived,
          );
          const done = current.filter(
            (task) => task.status === TaskStatus.DONE,
          ).length;
          const cancelled = current.filter(
            (task) => task.status === TaskStatus.CANCELLED,
          ).length;
          const total = current.length;
          return (
            <div
              key={sprint.id}
              className="rounded border border-slate-200 p-3"
            >
              <h3 className="text-sm font-semibold text-slate-700">
                {sprint.name}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {intl.formatMessage(
                  { id: "project.sprint.metricsSummary" },
                  { done, total, cancelled, open: total - done - cancelled },
                )}
              </p>
              <progress
                aria-label={intl.formatMessage(
                  { id: "project.sprint.progressFor" },
                  { name: sprint.name },
                )}
                value={done}
                max={total || 1}
                className="mt-2 h-2 w-full accent-blue-600"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
