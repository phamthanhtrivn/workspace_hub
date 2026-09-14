"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimplePaginationProps {
  page: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
  labels?: {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  };
}

export function SimplePagination({
  page,
  totalPages,
  isLoading,
  onPageChange,
  className,
  labels,
}: SimplePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), safeTotalPages);
  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < safeTotalPages && !isLoading;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-end gap-1", className)}
    >
      <PaginationButton
        label={labels?.first ?? "First page"}
        disabled={!canGoPrevious}
        onClick={() => onPageChange(1)}
      >
        <ChevronsLeft />
      </PaginationButton>
      <PaginationButton
        label={labels?.previous ?? "Previous page"}
        disabled={!canGoPrevious}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft />
      </PaginationButton>
      <span className="mx-1 inline-flex h-7 min-w-12 items-center justify-center rounded-full bg-white px-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
        {currentPage}/{safeTotalPages}
      </span>
      <PaginationButton
        label={labels?.next ?? "Next page"}
        disabled={!canGoNext}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight />
      </PaginationButton>
      <PaginationButton
        label={labels?.last ?? "Last page"}
        disabled={!canGoNext}
        onClick={() => onPageChange(safeTotalPages)}
      >
        <ChevronsRight />
      </PaginationButton>
    </nav>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-7 w-7 rounded-md text-[var(--color-primary)] hover:bg-blue-50 disabled:text-slate-300 disabled:hover:bg-transparent"
    >
      {children}
    </Button>
  );
}
