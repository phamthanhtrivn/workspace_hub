import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MeetingStatus } from "../../types/meeting.types";
import { getMeetingStatusLabel } from "../../utils/meeting-labels.utils";

const statusClassName: Record<MeetingStatus, string> = {
  SCHEDULED: "border-border bg-info-soft text-info",
  LIVE: "border-border bg-success-soft text-success",
  ENDED: "border-border bg-muted text-foreground",
  CANCELLED: "border-border bg-destructive-soft text-destructive",
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
      className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", statusClassName[status], className)}
    >
      {getMeetingStatusLabel(status)}
    </Badge>
  );
}
