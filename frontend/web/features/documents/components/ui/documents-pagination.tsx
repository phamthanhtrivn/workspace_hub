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
        "flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <span className="text-xs font-bold text-slate-500">
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
          className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        {pageNumbers.map((pageNumber, index) =>
          typeof pageNumber === "number" ? (
            <button
              key={`${pageNumber}-${index}`}
              type="button"
              disabled={isLoading}
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "h-9 min-w-9 cursor-pointer rounded-lg px-3 text-xs font-black transition",
                pageNumber === safePage
                  ? "bg-[#0052CC] text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
              aria-current={pageNumber === safePage ? "page" : undefined}
            >
              {pageNumber}
            </button>
          ) : (
            <span
              key={`ellipsis-${index}`}
              className="grid h-9 min-w-9 place-items-center px-1 text-xs font-black text-slate-400"
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
          className="h-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
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
