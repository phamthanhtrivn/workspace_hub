import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Circle,
  CircleDot,
  FolderKanban,
  History,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Table2,
  Timer,
} from "lucide-react";
import {
  POMODORO_REPORT_COPY,
  POMODORO_REPORT_PRESETS,
} from "@/features/pomodoro/constants/pomodoro-report";
import { POMODORO_TASK_COPY } from "@/features/pomodoro/constants/pomodoro-task";
import { PREVIEW_PROJECT, PREVIEW_TASK } from "../../landing-content";
import { PREVIEW_FOCUS_STATS } from "./preview-data";
import { PreviewAction, PreviewBadge, PreviewIcon } from "./preview-ui";

export function FocusTaskPanelsPreview() {
  return (
    <section aria-label="Sample focus task selection" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Choose a task, or use Free focus.
        </p>
        <PreviewAction className="min-h-10">
          <Circle aria-hidden="true" />
          <Timer aria-hidden="true" />
          Free focus
        </PreviewAction>
      </div>
      <div className="grid gap-5 @min-[900px]/preview-pomodoro:grid-cols-2">
        {(["calendar", "project"] as const).map((source) => {
          const calendar = source === "calendar";
          const Icon = calendar ? CalendarDays : FolderKanban;
          const tasks = calendar
            ? ["Review interview questions", "Write the research outline"]
            : [PREVIEW_TASK, "Review interview findings"];

          return (
            <div
              key={source}
              className="min-w-0 overflow-hidden rounded-panel border border-border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <h5 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon aria-hidden="true" className="size-4 text-link" />
                  {calendar ? "Calendar tasks" : "Project tasks"}
                </h5>
                <div className="flex items-center gap-2">
                  {calendar && (
                    <PreviewAction>
                      <Plus aria-hidden="true" />
                      {POMODORO_TASK_COPY.addTask}
                    </PreviewAction>
                  )}
                  <PreviewIcon icon={RotateCcw} label="Reset filters" />
                  <PreviewAction>
                    <SlidersHorizontal aria-hidden="true" />
                    {POMODORO_TASK_COPY.filters}
                  </PreviewAction>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {tasks.map((task, index) => {
                  const selected = !calendar && index === 0;

                  return (
                    <div
                      key={task}
                      className={`flex min-h-20 items-center gap-3 rounded-control border px-3 py-3 ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                    >
                      {selected ? (
                        <CircleDot
                          aria-hidden="true"
                          className="size-5 shrink-0"
                        />
                      ) : (
                        <Circle
                          aria-hidden="true"
                          className="size-5 shrink-0 text-muted-foreground"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{task}</p>
                        <p
                          className={`mt-1.5 text-xs ${selected ? "text-primary-foreground/90" : "text-muted-foreground"}`}
                        >
                          {calendar ? "My tasks" : PREVIEW_PROJECT}
                          {selected ? " · Selected" : ""}
                        </p>
                      </div>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </div>
                  );
                })}
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Showing 2 of 2 tasks
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FocusStatsPreview() {
  return (
    <section
      aria-label="Sample daily performance"
      className="overflow-hidden rounded-panel border border-border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-semibold">
            <Timer aria-hidden="true" className="size-4 text-link" />
            Today&apos;s performance
          </h5>
          <p className="mt-1 text-xs text-muted-foreground">
            Your focus activity today.
          </p>
        </div>
        <PreviewBadge>Today</PreviewBadge>
      </div>
      <dl className="grid grid-cols-2 gap-5 p-5 @min-[640px]/preview-pomodoro:grid-cols-4">
        {PREVIEW_FOCUS_STATS.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {stat.value}
            </dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              {"unit" in stat ? stat.unit : "Recorded today"}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-border p-4">
        <p className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground">
          <span>Daily focus goal</span>
          <span>50%</span>
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-link" />
        </div>
      </div>
    </section>
  );
}

export function FocusReportPreview() {
  return (
    <section
      aria-label="Sample focus history and reports"
      className="overflow-hidden rounded-panel border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-semibold">
            <ChartNoAxesCombined
              aria-hidden="true"
              className="size-4 text-link"
            />
            {POMODORO_REPORT_COPY.title}
          </h5>
          <p className="mt-1 text-xs text-muted-foreground">
            {POMODORO_REPORT_COPY.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {POMODORO_REPORT_PRESETS.map(({ value, label }) => (
            <PreviewAction
              key={value}
              variant={value === "week" ? "secondary" : "ghost"}
            >
              {label}
            </PreviewAction>
          ))}
          <PreviewAction>
            <SlidersHorizontal aria-hidden="true" />
            Filters
          </PreviewAction>
        </div>
      </div>
      <p className="border-b border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        Applied dates: Oct 26 – Nov 1, 2026 · Sample date range
      </p>
      <div className="p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-5 border-b border-border pb-5 @min-[800px]/preview-pomodoro:grid-cols-4">
          {[
            { label: "Focus time", value: "1h 40m" },
            { label: "Completed", value: "4" },
            { label: "Stopped early", value: "0" },
            { label: "Total sessions", value: "6" },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-xl font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 py-4">
          <PreviewAction variant="secondary">
            <History aria-hidden="true" />
            {POMODORO_REPORT_COPY.sessionHistory}
          </PreviewAction>
          <PreviewAction variant="ghost">
            <Table2 aria-hidden="true" />
            {POMODORO_REPORT_COPY.dailyStats}
          </PreviewAction>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-4">
          <div>
            <p className="text-sm font-medium">{PREVIEW_TASK}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Project · 25m actual / 25m planned · Oct 26, 09:00
            </p>
          </div>
          <PreviewBadge tone="success">Completed</PreviewBadge>
        </div>
      </div>
    </section>
  );
}
