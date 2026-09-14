"use client";

import React from "react";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { cn } from "@/lib/utils";

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
  itemsPerPage,
  isLoading = false,
  onPageChange,
  summaryText,
  className,
}: DocumentsPaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = (currentPage - 1) * (itemsPerPage || 10) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 10), totalItems || 0);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:flex-row sm:gap-0",
        className
      )}
    >
      <div className="text-xs font-semibold text-slate-500">
        {summaryText
          ? summaryText
          : totalItems
          ? `Showing ${startItem}-${endItem} of ${totalItems} items`
          : `Page ${currentPage} of ${totalPages}`}
      </div>
      <SimplePagination
        page={currentPage}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </div>
  );
}
