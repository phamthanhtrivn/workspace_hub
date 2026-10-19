"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COMPLETION_PERIODS, DEFAULT_COMPLETION_PERIOD, MAX_WORKLOAD_PROJECTS } from "../../constants/dashboard-analytics";
import type { useDashboard } from "../../hooks/use-dashboard";
import type { CompletionPeriod } from "../../types/dashboard-analytics.types";
import { buildProjectWorkload, buildTaskCompletionTrend, buildTaskDeadlineDistribution } from "../../utils/dashboard-analytics.utils";
import { DashboardPanel, EmptyState } from "../common/dashboard-panel";
import { DashboardChartData, DashboardChartFeedback, DashboardChartSkeleton } from "./dashboard-chart-support";

const DeadlineChart = dynamic(() => import("./dashboard-deadline-chart"), { ssr: false, loading: DashboardChartSkeleton });
const CompletionChart = dynamic(() => import("./dashboard-completion-chart"), { ssr: false, loading: DashboardChartSkeleton });
const WorkloadChart = dynamic(() => import("./dashboard-workload-chart"), { ssr: false, loading: DashboardChartSkeleton });

type DashboardProps = { dashboard: ReturnType<typeof useDashboard> };

function TaskDeadlines({ dashboard }: DashboardProps) {
  const { personal, project, tasks, today, zone } = dashboard;
  const ready = personal.isSuccess && project.isSuccess && Boolean(today);
  const slices = ready ? buildTaskDeadlineDistribution(tasks, today, zone) : [];
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  return (
    <DashboardPanel title="Task deadlines" description="Your open personal and assigned project tasks">
      <DashboardChartFeedback queries={[{ query: personal, label: "personal tasks" }, { query: project, label: "assigned project tasks" }]} />
      {ready ? total ? (
        <>
          <DeadlineChart slices={slices} />
          <ul aria-label="Task deadline totals" className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-2">
            {slices.map((slice) => (
              <li key={slice.label} className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.fill }} />
                <span className="flex-1 text-muted-foreground">{slice.label}</span>
                <span className="font-medium tabular-nums">{slice.count} <span className="font-normal text-muted-foreground">({Math.round(slice.percentage)}%)</span></span>
              </li>
            ))}
          </ul>
        </>
      ) : <EmptyState>No open tasks. You are all caught up.</EmptyState> : null}
    </DashboardPanel>
  );
}

function TaskCompletions({ dashboard }: DashboardProps) {
  const [period, setPeriod] = useState<CompletionPeriod>(DEFAULT_COMPLETION_PERIOD);
  const { completedTasks, today, zone } = dashboard;
  const ready = completedTasks.isSuccess && Boolean(today);
  const days = ready ? buildTaskCompletionTrend(completedTasks.data, today, zone, period) : [];
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return (
    <DashboardPanel title="Completion trend" description="Personal and assigned project tasks completed each day">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {ready ? <><span className="font-semibold text-foreground tabular-nums">{total}</span> completed in {period} days</> : "Completed tasks"}
        </p>
        <div role="group" aria-label="Completion trend period" className="flex gap-1 rounded-control bg-muted p-1">
          {COMPLETION_PERIODS.map((days) => (
            <Button key={days} size="sm" variant="ghost" aria-pressed={period === days} onClick={() => setPeriod(days)} className="min-h-11 aria-pressed:bg-card aria-pressed:text-foreground motion-reduce:transition-none sm:min-h-8 [@media(pointer:coarse)]:min-h-11">
              {days} days
            </Button>
          ))}
        </div>
      </div>
      <DashboardChartFeedback queries={[{ query: completedTasks, label: "completed tasks" }]} />
      {ready ? total ? (
        <>
          <CompletionChart days={days} />
          <DashboardChartData caption={`Completed tasks in the last ${period} days`} columns={["Date", "Completed tasks"]} rows={days.map((day) => ({ key: day.date, cells: [day.date, day.count] }))} />
        </>
      ) : <EmptyState>No completed tasks in the last {period} days. Completed work will appear here.</EmptyState> : null}
    </DashboardPanel>
  );
}

function ProjectWorkloads({ dashboard }: DashboardProps) {
  const { project, today, zone } = dashboard;
  const ready = project.isSuccess && Boolean(today);
  const projects = ready ? buildProjectWorkload(project.data, today, zone) : [];
  return (
    <DashboardPanel title="Project workload" description={`Top ${MAX_WORKLOAD_PROJECTS} active projects by open tasks assigned to you`} className="col-span-full">
      <DashboardChartFeedback queries={[{ query: project, label: "assigned project tasks" }]} />
      {ready ? projects.length ? (
        <>
          <WorkloadChart projects={projects} />
          <DashboardChartData caption="Open tasks assigned to you by project" columns={["Project", "Overdue", "Other open tasks", "Total"]} rows={projects.map((project) => ({
            key: project.projectId,
            cells: [<Link key={project.projectId} href={`/projects/${encodeURIComponent(project.projectId)}`} className="inline-flex min-h-11 max-w-full items-center rounded-control text-link underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{project.projectName}</Link>, project.overdue, project.remaining, project.total],
          }))} />
        </>
      ) : <EmptyState>No open tasks assigned to you in active projects.</EmptyState> : null}
    </DashboardPanel>
  );
}

export function DashboardAnalytics({ dashboard }: DashboardProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 @min-[960px]/dashboard:grid-cols-2">
      <TaskDeadlines dashboard={dashboard} />
      <TaskCompletions dashboard={dashboard} />
      <ProjectWorkloads dashboard={dashboard} />
    </div>
  );
}
