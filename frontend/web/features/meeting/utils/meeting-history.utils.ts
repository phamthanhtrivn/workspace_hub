import type { IntlShape } from "react-intl";
import type { MeetingHistoryItem } from "../../types/meeting.types";

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

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  let firstPage = Math.max(1, safeCurrentPage - 1);
  let lastPage = Math.min(totalPages, safeCurrentPage + 1);

  if (safeCurrentPage === 1) {
    lastPage = Math.min(totalPages, 3);
  }

  if (safeCurrentPage === totalPages) {
    firstPage = Math.max(1, totalPages - 2);
  }

  const pages: MeetingHistoryPageNumber[] = [];

  if (firstPage > 1) {
    pages.push("ellipsis-start");
  }

  for (let page = firstPage; page <= lastPage; page += 1) {
    pages.push(page);
  }

  if (lastPage < totalPages) {
    pages.push("ellipsis-end");
  }

  return pages;
}
