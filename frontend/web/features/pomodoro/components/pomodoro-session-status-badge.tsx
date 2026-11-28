import { AlertCircle, CheckCircle2, FastForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import type { PomodoroSessionStatus } from "../types/pomodoro";

const STATUS_STYLES = {
  COMPLETED: { icon: CheckCircle2, className: "bg-success-soft text-success-content" },
  STOPPED: { icon: AlertCircle, className: "bg-warning-soft text-warning-content" },
  SKIPPED: { icon: FastForward, className: "bg-muted text-muted-foreground" },
} satisfies Record<PomodoroSessionStatus, { icon: typeof CheckCircle2; className: string }>;

export function PomodoroSessionStatusBadge({ status }: { status: PomodoroSessionStatus }) {
  const { icon: Icon, className } = STATUS_STYLES[status];
  return <Badge variant="outline" className={`shrink-0 gap-1.5 rounded-control border-transparent px-2 py-1 text-xs font-medium ${className}`}>
    <Icon aria-hidden="true" className="size-3.5" />{copy.sessionStatuses[status]}
  </Badge>;
}
