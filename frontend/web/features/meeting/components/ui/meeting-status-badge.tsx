import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MeetingStatus } from "../../types/meeting.types";
import { getMeetingStatusLabel } from "../../utils/meeting-labels.utils";

const statusClassName: Record<MeetingStatus, string> = {
  SCHEDULED: "border-blue-200 bg-blue-50 text-blue-700",
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ENDED: "border-slate-200 bg-slate-100 text-slate-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
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
      className={cn("rounded-md px-2.5 py-1 text-xs font-black", statusClassName[status], className)}
    >
      {getMeetingStatusLabel(status)}
    </Badge>
  );
}
