import { CheckCircle2, Clock, Layers3, PauseCircle } from "lucide-react";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import {
  formatFocusTime,
  type buildPomodoroReport,
} from "../utils/pomodoro-report";

export function PomodoroReportSummary({
  summary,
}: {
  summary: ReturnType<typeof buildPomodoroReport>["summary"];
}) {
  const metrics = [
    {
      label: copy.focusTime,
      value: formatFocusTime(summary.focusSeconds),
      hint: "Actual deep focus duration",
      icon: Clock,
      color: "text-link",
    },
    {
      label: copy.completed,
      value: summary.completedFocusSessions,
      hint: "Finished full target intervals",
      icon: CheckCircle2,
      color: "text-success-content",
    },
    {
      label: copy.stopped,
      value: summary.stoppedFocusSessions,
      hint: "Ended or skipped early",
      icon: PauseCircle,
      color: "text-warning-content",
    },
    {
      label: copy.total,
      value: summary.totalSessions,
      hint: copy.totalHint,
      icon: Layers3,
      color: "text-info-content",
    },
  ];

  return (
    <dl className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
      {metrics.map(({ label, value, hint, icon: Icon, color }) => (
        <div
          key={label}
          className="min-w-0 py-4 sm:px-4 first:sm:pl-0 last:sm:pr-0"
        >
          <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${color}`} />
            {label}
          </dt>
          <dd className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight text-foreground tabular-nums">
            {value}
          </dd>
          <dd className="mt-1 text-[11px] text-muted-foreground">{hint}</dd>
        </div>
      ))}
    </dl>
  );
}
