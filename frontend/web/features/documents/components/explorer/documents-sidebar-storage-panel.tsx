"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { documentsApi } from "../../api/documents.api";
import { calculateQuotaStats } from "../../utils/documents.utils";
import { cn } from "@/lib/utils";

export function DocumentsSidebarStoragePanel() {
  const {
    data: quota,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["document-quota"],
    queryFn: documentsApi.getQuota,
  });

  const { usedMB, maxGB, percentage } = useMemo(() => {
    if (!quota) {
      return { usedMB: "0", maxGB: "5", percentage: 0 };
    }
    return calculateQuotaStats(quota.usedBytes, quota.maxBytes);
  }, [quota]);

  if (isLoading) {
    return (
      <div className="mt-auto hidden rounded-lg border border-border bg-card p-4 @min-[960px]/documents:block">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-info-content" />
          <span className="text-xs font-semibold text-muted-foreground">
            Loading storage stats...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !quota) {
    return (
      <div className="mt-auto hidden rounded-lg border border-dashed border-border bg-destructive-soft p-3 text-xs font-semibold text-destructive-content @min-[960px]/documents:block">
        Could not load storage quota.
      </div>
    );
  }

  return (
    <section className="mt-auto hidden overflow-hidden rounded-lg border border-border bg-card @min-[960px]/documents:block">
      <div className="bg-card p-4 text-card-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-card-foreground ">
              Storage used
            </p>
            <p className="mt-2 text-lg font-semibold leading-none">
              {usedMB}{" "}
              <span className="text-sm font-semibold text-card-foreground">MB</span>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
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
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-card-foreground">
          <span>
            {usedMB} MB of {maxGB} GB
          </span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      </div>
    </section>
  );
}

export default React.memo(DocumentsSidebarStoragePanel);
