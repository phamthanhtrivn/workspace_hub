import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  HardDrive,
  ListChecks,
  Plus,
  Sun,
  Video,
} from "lucide-react";
import {
  DASHBOARD_ACCENTS,
  DASHBOARD_DEADLINE_TONES,
} from "@/features/dashboard/constants/dashboard-appearance";
import { PREVIEW_PROJECT, PREVIEW_TASK } from "../../landing-content";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewBadge } from "./preview-ui";

const DASHBOARD_KPI_CARDS = [
  {
    label: "Overdue",
    value: "1",
    detail: "Tasks needing attention",
    icon: AlertCircle,
    iconTheme: DASHBOARD_DEADLINE_TONES.Overdue,
    valueClass: "text-destructive-content",
  },
  {
    label: "Due today",
    value: "3",
    detail: "Open tasks due today",
    icon: ListChecks,
    iconTheme: DASHBOARD_ACCENTS.calendar,
    valueClass: "text-link",
  },
  {
    label: "Focus today",
    value: "1h 40m",
    detail: "Recorded focus time",
    icon: Clock3,
    iconTheme: DASHBOARD_ACCENTS.focus,
    valueClass: "text-foreground",
  },
  {
    label: "Next meeting",
    value: "45 min",
    detail: "Sprint review",
    icon: Video,
    iconTheme: DASHBOARD_ACCENTS.meeting,
    valueClass: "text-foreground",
  },
] as const;

const DASHBOARD_TASKS = [
  {
    title: PREVIEW_TASK,
    project: PREVIEW_PROJECT,
    badge: "Today",
    done: false,
  },
  {
    title: "Review interview findings",
    project: PREVIEW_PROJECT,
    badge: "In progress",
    done: false,
  },
  {
    title: "Prepare usability questions",
    project: "Personal",
    badge: "Tomorrow",
    done: false,
  },
  {
    title: "Define project scope",
    project: PREVIEW_PROJECT,
    badge: "Done",
    done: true,
  },
] as const;

const DASHBOARD_SCHEDULE = [
  { time: "10:00", title: "Prototype work", kind: "Focus" },
  { time: "14:00", title: "Sprint review", kind: "Meeting" },
  { time: "16:30", title: "Chapter 3 outline", kind: "Task" },
] as const;

export function DashboardPreview() {
  return (
    <PreviewShell moduleId="dashboard">
      <div
        role="region"
        aria-label="Sample WorkspaceHub dashboard"
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[800px]/preview-module:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-warning-soft text-warning-content">
              <Sun aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Good morning, Tri</p>
              <p className="mt-0.5 text-page-title font-semibold tracking-tight">
                Wednesday, 28<span className="text-link">.</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-link">
                <PreviewBadge tone="info">Up next</PreviewBadge>
                <span className="font-medium">Sprint review · in 45 min</span>
              </div>
            </div>
          </div>
          <PreviewAction variant="default" className="h-9 gap-1.5">
            <Plus aria-hidden="true" className="size-4" />
            Create task
          </PreviewAction>
        </div>

        <div className="grid grid-cols-1 gap-3 @min-[480px]/preview-module:grid-cols-2 @min-[900px]/preview-module:grid-cols-4">
          {DASHBOARD_KPI_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-panel border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                <span>{card.label}</span>
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-control ${card.iconTheme}`}
                >
                  <card.icon aria-hidden="true" className="size-4" />
                </span>
              </div>
              <p
                className={`mt-2.5 text-2xl font-semibold tracking-tight tabular-nums ${card.valueClass}`}
              >
                {card.value}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {card.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 @min-[860px]/preview-module:grid-cols-2">
          <div className="rounded-panel border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-sm font-semibold">My tasks</h5>
              <PreviewBadge>4 open</PreviewBadge>
            </div>
            <div className="divide-y divide-border">
              {DASHBOARD_TASKS.map((task) => (
                <div
                  key={task.title}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate font-medium ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {task.project}
                    </p>
                  </div>
                  <PreviewBadge tone={task.done ? "success" : "muted"}>
                    {task.badge}
                  </PreviewBadge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-panel border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-sm font-semibold">My day</h5>
              <CalendarDays
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            </div>
            <div className="divide-y divide-border">
              {DASHBOARD_SCHEDULE.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="font-semibold tabular-nums text-muted-foreground">
                      {item.time}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {item.title}
                    </span>
                  </div>
                  <PreviewBadge tone="info">{item.kind}</PreviewBadge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 @min-[860px]/preview-module:grid-cols-2">
          <div className="rounded-panel border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen aria-hidden="true" className="size-4 text-link" />
                Recent AI Notebooks
              </h5>
              <span className="text-xs font-semibold text-link">Open AI</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-control border border-border bg-background px-3 py-2">
                <span className="font-medium">Prototype research</span>
                <span className="text-muted-foreground">
                  2 sources · 1 note
                </span>
              </div>
              <div className="flex items-center justify-between rounded-control border border-border bg-background px-3 py-2">
                <span className="font-medium">Thesis literature review</span>
                <span className="text-muted-foreground">
                  4 sources · 3 notes
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-panel border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="flex items-center gap-2 text-sm font-semibold">
                <HardDrive aria-hidden="true" className="size-4 text-link" />
                Documents &amp; Storage
              </h5>
              <span className="text-xs text-muted-foreground tabular-nums">
                1.2 GB / 5 GB
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/4 bg-primary" />
              <div className="h-full w-1/6 bg-link" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 truncate text-foreground">
                <FileText aria-hidden="true" className="size-3.5 text-link" />
                Research brief.pdf
              </span>
              <span>2.4 MB</span>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
