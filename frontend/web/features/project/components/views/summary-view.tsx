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
import { ProjectMetricCard } from "../summary/project-metric-card";
import { ProjectSummaryPanel } from "../summary/project-summary-panel";
import { PriorityDistributionBar } from "../summary/priority-distribution-bar";
import { MemberWorkloadList } from "../summary/member-workload-list";

import { formatTimeAgo } from "@/lib/date";
import { useProjectSummaryMetrics } from "@/features/project/hooks/use-project-summary-metrics";

export default function SummaryView({
  tasks,
  members,
}: {
  tasks: Task[];
  members: ProjectMember[];
}) {
  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "2-digit",
        })
      : "Not set";
  const {
    now,
    activeTasks,
    rootTasks,
    subtasks,
    subtaskCompletionPercent,
    completed,
    completedRecently,
    createdRecently,
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
    <div className="w-full space-y-4 pb-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <ProjectMetricCard
          icon={ListChecks}
          value={rootTasks.length}
          label="Tasks"
          sublabel={`+${createdRecently.length} created this week`}
          color="bg-info-soft text-info"
        />
        <ProjectMetricCard
          icon={Activity}
          value={subtasks.length}
          label="Subtasks"
          sublabel={`${subtaskCompletionPercent}% completed`}
          color="bg-info-soft text-info"
        />
        <ProjectMetricCard
          icon={CheckCircle2}
          value={completed.length}
          label="Completed"
          sublabel={`+${completedRecently.length} done this week`}
          color="bg-success-soft text-success"
        />
        <ProjectMetricCard
          icon={CircleAlert}
          value={overdue.length}
          label="Overdue"
          sublabel={
            overdue.length > 0
              ? `${dueSoon.length} due in next 7 days`
              : "All deadlines on track"
          }
          color="bg-destructive-soft text-destructive"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <ProjectSummaryPanel
          title="Work Progress"
          description="Overall completion percentage and status breakdown."
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--success) ${completionPercent}%, var(--border) ${completionPercent}% 100%)`,
              }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center">
                <strong className="text-2xl text-foreground">
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
                  <span className="flex items-center gap-2 text-muted-foreground">
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
          title="Upcoming Deadlines"
          description="Tasks that are approaching their due dates soon."
        >
          {dueSoon.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-muted-foreground">
              No upcoming deadlines in the near future.
            </p>
          ) : (
            <div className="space-y-2">
              {dueSoon.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded border border-border px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-warning">
                    {formatDate(task.dueDate)}
                  </span>
                  <TaskStatusBadge status={task.status} compact />
                </div>
              ))}
            </div>
          )}
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Priority Breakdown"
          description="Distribution of tasks across priority tiers."
        >
          <PriorityDistributionBar
            items={priorityItems}
            maxValue={maxPriority}
          />
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Team Workload"
          description="Number of assigned tasks per project team member."
        >
          <MemberWorkloadList
            items={workload}
            maxCount={maxWorkload}
            barColor="bg-primary"
            emptyMessage="No assigned workload to display."
          />
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Unscheduled Tasks"
          description="Tasks missing a start date or due date."
        >
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {unscheduled.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Tasks needing scheduling in Roadmap or Schedule.
              </p>
            </div>
          </div>
        </ProjectSummaryPanel>

        <ProjectSummaryPanel
          title="Recent Activity"
          description="Recently updated or modified tasks."
        >
          {recentTasks.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-muted-foreground">
              No recent task activity.
            </p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 border-b border-border pb-2 last:border-0"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {task.title}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatTimeAgo(task.updatedAt || task.createdAt)}
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
