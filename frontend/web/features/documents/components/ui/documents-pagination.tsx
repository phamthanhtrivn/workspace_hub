"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocumentsPageNumbers } from "../../utils/documents-pagination.utils";
import { ITEMS_PER_PAGE } from "../../types/documents.constants";
import { Button } from "@/components/ui/button";

export interface DocumentsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  summaryText?: string;
  className?: string;
}

export function DocumentsPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = ITEMS_PER_PAGE,
  isLoading = false,
  onPageChange,
  summaryText,
  className,
}: DocumentsPaginationProps) {
  const safePage = Math.min(Math.max(1, currentPage), totalPages || 1);
  const total = totalItems || 0;
  const startItem = total === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, total);
  const pageNumbers = getDocumentsPageNumbers(safePage, totalPages);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground">
        {summaryText
          ? summaryText
          : total > 0
          ? `Showing ${startItem}-${endItem} of ${total} items`
          : `Page ${safePage} of ${totalPages}`}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage === 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="h-9 gap-1.5 rounded-control border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-background cursor-pointer disabled:opacity-50"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        {pageNumbers.map((pageNumber, index) =>
          typeof pageNumber === "number" ? (
            <Button variant="unstyled"
              key={`${pageNumber}-${index}`}
              type="button"
              disabled={isLoading}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "h-9 min-w-9 cursor-pointer rounded-control px-3 text-xs font-semibold transition",
                pageNumber === safePage
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-background"
              )}
              aria-current={pageNumber === safePage ? "page" : undefined}
            >
              {pageNumber}
            </Button>
          ) : (
            <span
              key={`ellipsis-${index}`}
              className="grid h-9 min-w-9 place-items-center px-1 text-xs font-semibold text-muted-foreground"
              aria-hidden="true"
            >
              ...
            </span>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages || isLoading}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="h-9 gap-1.5 rounded-control border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-background cursor-pointer disabled:opacity-50"
          aria-label="Next"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default React.memo(DocumentsPagination);
