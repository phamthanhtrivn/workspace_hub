"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, Loader2 } from "lucide-react";
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
      <div className="mt-auto hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_38px_rgba(15,40,84,0.08)] xl:block">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#0052CC]" />
          <span className="text-xs font-bold text-slate-500">
            Loading storage stats...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !quota) {
    return (
      <div className="mt-auto hidden rounded-lg border border-dashed border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600 xl:block">
        Could not load storage quota.
      </div>
    );
  }

  return (
    <section className="mt-auto hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_38px_rgba(15,40,84,0.08)] xl:block">
      {/* Top Banner Header */}
      <div className="bg-[#172B4D] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-blue-100 uppercase tracking-wider">
              STORAGE USED
            </p>
            <p className="mt-2 text-3xl font-black leading-none">
              {usedMB}{" "}
              <span className="text-sm font-bold text-blue-200">MB</span>
            </p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/14 text-white ring-1 ring-white/18">
            <HardDrive className="h-5 w-5" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              percentage > 90
                ? "bg-red-400"
                : percentage > 75
                  ? "bg-amber-400"
                  : "bg-blue-400",
            )}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-blue-100">
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
