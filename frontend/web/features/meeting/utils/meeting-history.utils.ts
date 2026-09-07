import type { IntlShape } from "react-intl";
import type { MeetingHistoryItem } from "../types/meeting.types";

export function getMeetingHistoryTitleId(meeting: MeetingHistoryItem) {
  return `meeting.history.type.${meeting.type}`;
}

export function formatMeetingHistoryStartTime(
  value: string | null,
  intl: IntlShape,
) {
  if (!value) return intl.formatMessage({ id: "meeting.history.notStarted" });

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return intl.formatMessage({ id: "meeting.history.notStarted" });
  }

  return new Intl.DateTimeFormat(intl.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export type MeetingHistoryPageNumber =
  | number
  | "ellipsis-start"
  | "ellipsis-end";

export function getMeetingHistoryPageNumbers(
  currentPage: number,
  totalPages: number,
): MeetingHistoryPageNumber[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const firstNearbyPage = Math.max(2, safeCurrentPage - 2);
  const lastNearbyPage = Math.min(totalPages - 1, safeCurrentPage + 2);
  const pages: MeetingHistoryPageNumber[] = [];

  pages.push(1);

  if (firstNearbyPage > 2) {
    pages.push("ellipsis-start");
  }

  for (let page = firstNearbyPage; page <= lastNearbyPage; page += 1) {
    pages.push(page);
  }

  if (lastNearbyPage < totalPages - 1) {
    pages.push("ellipsis-end");
  }

  pages.push(totalPages);

  return pages;
}

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