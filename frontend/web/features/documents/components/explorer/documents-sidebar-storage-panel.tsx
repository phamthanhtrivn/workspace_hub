"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";

import { documentsApi } from "../../api/documents.api";
import { calculateQuotaStats } from "../../utils/documents.utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function formatCompactBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 0.1) return `${mb.toFixed(1)} MB`;

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DocumentsSidebarStoragePanel({
  collapsed = false,
  onExpand,
}: {
  collapsed?: boolean;
  onExpand?: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    data: quota,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["document-quota"],
    queryFn: documentsApi.getQuota,
  });

  const { usedMB, maxGB, percentage, breakdown } = useMemo(() => {
    if (!quota) {
      return {
        usedMB: "0",
        maxGB: "5",
        percentage: 0,
        breakdown: { documentsPct: 0, mediaPct: 0, otherPct: 0 },
      };
    }
    const base = calculateQuotaStats(quota.usedBytes, quota.maxBytes);
    const maxBytes = Math.max(1, quota.maxBytes);
    const b = quota.breakdown;

    return {
      ...base,
      breakdown: b
        ? {
            documentsPct: Math.min(100, (b.documentsBytes / maxBytes) * 100),
            mediaPct: Math.min(100, (b.mediaBytes / maxBytes) * 100),
            otherPct: Math.min(100, (b.otherBytes / maxBytes) * 100),
          }
        : {
            documentsPct: base.percentage,
            mediaPct: 0,
            otherPct: 0,
          },
    };
  }, [quota]);

  if (collapsed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={onExpand}
        title={`Storage: ${usedMB} MB of ${maxGB} GB (${percentage.toFixed(0)}%)`}
        aria-label="Expand sidebar to view storage"
        className="mt-auto hidden size-8 flex-col gap-0.5 rounded-control border-border bg-card p-1 @min-[960px]/documents:flex"
      >
        <HardDrive className="size-3.5 text-link" aria-hidden="true" />
        <span className="h-1 w-5 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </span>
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-auto hidden rounded-panel border border-border bg-card p-3.5 @min-[960px]/documents:block">
        <div role="status" className="flex items-center gap-3">
          <Spinner />
          <span className="text-xs font-semibold text-muted-foreground">
            Loading storage stats...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !quota) {
    return (
      <div className="mt-auto hidden rounded-panel border border-dashed border-border bg-destructive-soft p-3 text-xs font-semibold text-destructive-content @min-[960px]/documents:block">
        Could not load storage quota.
      </div>
    );
  }

  return (
    <section className="mt-auto hidden overflow-hidden rounded-panel border border-border bg-card p-3.5 @min-[960px]/documents:block">
      <Button
        type="button"
        variant="unstyled"
        onClick={() => setDetailsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left text-xs"
      >
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <HardDrive className="size-3.5 text-link" aria-hidden="true" />
          Document Storage
        </span>
        <span className="text-[11px] font-semibold text-link">
          {detailsOpen ? "Hide" : "Details"}
        </span>
      </Button>

      {/* Segmented Progress Bar */}
      <div className="mt-2.5 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {quota.breakdown ? (
          <>
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${breakdown.documentsPct}%` }}
              title={`Documents: ${formatCompactBytes(quota.breakdown.documentsBytes)}`}
            />
            <div
              className="h-full bg-link transition-all duration-200"
              style={{ width: `${breakdown.mediaPct}%` }}
              title={`Media: ${formatCompactBytes(quota.breakdown.mediaBytes)}`}
            />
            <div
              className="h-full bg-info-content/60 transition-all duration-200"
              style={{ width: `${breakdown.otherPct}%` }}
              title={`Code & Archives: ${formatCompactBytes(quota.breakdown.otherBytes)}`}
            />
          </>
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              percentage > 90
                ? "bg-destructive-content"
                : percentage > 75
                  ? "bg-warning-content"
                  : "bg-link",
            )}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span className="font-semibold text-foreground">
          {usedMB} MB / {maxGB} GB used
        </span>
        <span>{percentage.toFixed(0)}%</span>
      </div>

      {detailsOpen && quota.breakdown && (
        <div className="mt-2.5 space-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground tabular-nums">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Documents
            </span>
            <span className="font-semibold text-foreground">
              {formatCompactBytes(quota.breakdown.documentsBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-link" />
              Media
            </span>
            <span className="font-semibold text-foreground">
              {formatCompactBytes(quota.breakdown.mediaBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-info-content/60" />
              Code &amp; Archives
            </span>
            <span className="font-semibold text-foreground">
              {formatCompactBytes(quota.breakdown.otherBytes)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default React.memo(DocumentsSidebarStoragePanel);
