"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MeetingButton } from "../ui/meeting-form-controls";
import { getMeetingHistoryPageNumbers } from "../../utils/meeting-history.utils";

interface MeetingPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function MeetingPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: MeetingPaginationProps) {
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const end = Math.min(safePage * limit, total);
  const pageNumbers = getMeetingHistoryPageNumbers(safePage, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-muted-foreground">
        Showing {start}-{end} of {total}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <MeetingButton
          type="button"
          tone="outline"
          controlSize="sm"
          disabled={safePage === 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="cursor-pointer"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </MeetingButton>
        {pageNumbers.map((pageNumber) =>
          typeof pageNumber === "number" ? (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "h-9 min-w-9 cursor-pointer rounded-control px-3 text-xs font-semibold transition",
                pageNumber === safePage
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-background",
              )}
              aria-current={pageNumber === safePage ? "page" : undefined}
            >
              {pageNumber}
            </button>
          ) : (
            <span
              key={pageNumber}
              className="grid h-9 min-w-9 place-items-center px-1 text-xs font-semibold text-muted-foreground"
              aria-hidden="true"
            >
              ...
            </span>
          ),
        )}
        <MeetingButton
          type="button"
          tone="outline"
          controlSize="sm"
          disabled={safePage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="cursor-pointer"
          aria-label="Next"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </MeetingButton>
      </div>
    </div>
  );
}
