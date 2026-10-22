import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MeetingStatus } from "../../types/meeting.types";
import { getMeetingStatusLabel } from "../../utils/meeting-labels.utils";

const statusClassName: Record<MeetingStatus, string> = {
  SCHEDULED: "bg-info-soft text-info-content",
  LIVE: "bg-success-soft text-success-content",
  ENDED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive-soft text-destructive-content",
};

export function MeetingStatusBadge({
  status,
  className,
}: {
  status: MeetingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-md border-transparent px-2.5 py-1 text-xs font-medium", statusClassName[status], className)}
    >
      {status === "LIVE" ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {getMeetingStatusLabel(status)}
    </Badge>
  );
}
