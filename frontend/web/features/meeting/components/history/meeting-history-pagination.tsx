"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { getMeetingHistoryPageNumbers } from "../../utils/meeting-history.utils";

interface MeetingHistoryPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function MeetingHistoryPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: MeetingHistoryPaginationProps) {
  const intl = useAppIntl();
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = Math.min(safePage * limit, total);
  const pageNumbers = getMeetingHistoryPageNumbers(safePage, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-slate-500">
        {intl.formatMessage(
          { id: "meeting.history.paginationSummary" },
          { start, end, total },
        )}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={intl.formatMessage({ id: "app.previous" })}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers.map((pageNumber) =>
          typeof pageNumber === "number" ? (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "h-9 min-w-9 cursor-pointer rounded-lg px-3 text-xs font-black transition",
                pageNumber === safePage
                  ? "bg-[#0052CC] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
              aria-current={pageNumber === safePage ? "page" : undefined}
            >
              {pageNumber}
            </button>
          ) : (
            <span
              key={pageNumber}
              className="grid h-9 min-w-9 place-items-center px-1 text-xs font-black text-slate-400"
              aria-hidden="true"
            >
              ...
            </span>
          ),
        )}
        <button
          type="button"
          disabled={safePage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={intl.formatMessage({ id: "app.next" })}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
