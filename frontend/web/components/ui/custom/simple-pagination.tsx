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
  ariaLabel?: string;
  compact?: boolean;
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
  ariaLabel = "Pagination",
  compact = false,
  labels,
}: SimplePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), safeTotalPages);
  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < safeTotalPages && !isLoading;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-10 flex-wrap items-center justify-end gap-1 p-1",
        className,
      )}
    >
      {!compact && (
        <PaginationButton
          label={labels?.first ?? "First page"}
          disabled={!canGoPrevious}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft />
        </PaginationButton>
      )}
      <PaginationButton
        label={labels?.previous ?? "Previous page"}
        disabled={!canGoPrevious}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft />
      </PaginationButton>
      <span
        aria-current="page"
        aria-label={`Page ${currentPage} of ${safeTotalPages}`}
        className="mx-1 inline-flex h-8 min-w-14 shrink-0 items-center justify-center rounded-control border border-border bg-card px-2 text-xs font-medium text-foreground tabular-nums"
      >
        {currentPage} / {safeTotalPages}
      </span>
      <PaginationButton
        label={labels?.next ?? "Next page"}
        disabled={!canGoNext}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight />
      </PaginationButton>
      {!compact && (
        <PaginationButton
          label={labels?.last ?? "Last page"}
          disabled={!canGoNext}
          onClick={() => onPageChange(safeTotalPages)}
        >
          <ChevronsRight />
        </PaginationButton>
      )}
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
      className="size-8 rounded-control text-link hover:bg-info-soft disabled:text-muted-foreground disabled:hover:bg-transparent motion-reduce:transition-none"
    >
      {children}
    </Button>
  );
}
