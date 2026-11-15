import type { MeetingHistoryItem } from "../types/meeting.types";
import { getMeetingTypeLabel } from "./meeting-labels.utils";

export function getMeetingHistoryTitle(meeting: MeetingHistoryItem) {
  return getMeetingTypeLabel(meeting.type);
}

export function formatMeetingHistoryStartTime(value: string | null) {
  if (!value) return "Not started";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export { getPaginationPageNumbers as getMeetingHistoryPageNumbers } from "@/components/ui/pagination-utils";
export type { PaginationPageNumber as MeetingHistoryPageNumber } from "@/components/ui/pagination-utils";

export function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed");
  }
}
