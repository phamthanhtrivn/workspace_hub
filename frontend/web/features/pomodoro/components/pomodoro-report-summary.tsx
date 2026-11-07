import { CheckCircle2, Layers3, PauseCircle, Timer } from "lucide-react";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import { formatFocusTime, type buildPomodoroReport } from "../utils/pomodoro-report";

export function PomodoroReportSummary({ summary }: { summary: ReturnType<typeof buildPomodoroReport>["summary"] }) {
  const metrics = [
    { label: copy.focusTime, value: formatFocusTime(summary.focusSeconds), icon: Timer, color: "text-link" },
    { label: copy.completed, value: summary.completedFocusSessions, icon: CheckCircle2, color: "text-success-content" },
    { label: copy.stopped, value: summary.stoppedFocusSessions, icon: PauseCircle, color: "text-warning-content" },
    { label: copy.total, value: summary.totalSessions, icon: Layers3, color: "text-muted-foreground" },
  ];
  return <dl className="grid grid-cols-2 gap-x-3 gap-y-5 border-b border-border py-5 @min-[480px]/pomodoro:gap-x-6 @min-[800px]/pomodoro:grid-cols-4">
    {metrics.map(({ label, value, icon: Icon, color }) => <div key={label} className="min-w-0 @min-[800px]/pomodoro:border-r @min-[800px]/pomodoro:border-border @min-[800px]/pomodoro:pr-4 @min-[800px]/pomodoro:last:border-r-0">
      <dt className="flex items-start gap-2 text-xs font-medium text-muted-foreground"><Icon aria-hidden="true" className={`size-4 shrink-0 ${color}`} />{label}</dt>
      <dd className="mt-2 break-words text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums @min-[480px]/pomodoro:text-2xl">{value}</dd>
      {label === copy.total && <dd className="mt-1 text-xs text-muted-foreground">{copy.totalHint}</dd>}
    </div>)}
  </dl>;
}
