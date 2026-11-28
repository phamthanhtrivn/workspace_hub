import type { MeetingSummary } from "../types/meeting-summary.types";

/** The same semantic tone identifies both the bot and its status badge. */
export function meetingSummaryPresentation(
  summary: MeetingSummary | undefined,
  unavailable: boolean,
) {
  if (summary?.status === "COMPLETED")
    return {
      label: "Ready",
      className: "bg-success-soft text-success-content",
    };
  if (summary?.status === "QUEUED" || summary?.status === "RUNNING")
    return {
      label: "In progress",
      className: "bg-info-soft text-info-content",
    };
  if (summary?.status === "FAILED")
    return {
      label: "Needs attention",
      className: "bg-destructive-soft text-destructive-content",
    };
  if (
    unavailable ||
    summary?.availability === "UNAVAILABLE" ||
    summary?.enabled === false
  )
    return {
      label: "Unavailable",
      className: "bg-warning-soft text-warning-content",
    };

  return {
    label: "Manual generation",
    className: "bg-secondary text-secondary-foreground",
  };
}
