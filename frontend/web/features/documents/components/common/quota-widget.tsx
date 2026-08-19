import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../../api/documents.api";
import { HardDrive, Loader2 } from "lucide-react";
import { calculateQuotaStats } from "../../utils/documents.utils";
import { cn } from "@/lib/utils";

function QuotaWidget() {
  const { data: quota, isLoading } = useQuery({
    queryKey: ["document-quota"],
    queryFn: documentsApi.getQuota,
  });

  const { usedMB, maxGB, percentage } = useMemo(() => {
    if (!quota) {
      return { usedMB: "0", maxGB: "0", percentage: 0 };
    }
    return calculateQuotaStats(quota.usedBytes, quota.maxBytes);
  }, [quota]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-slate-400" size={16} />
      </div>
    );
  }

  if (!quota) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2 text-slate-600 mb-2">
        <HardDrive size={18} className="text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Storage used
        </span>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percentage > 90
              ? "bg-red-500"
              : percentage > 75
                ? "bg-amber-500"
                : "bg-[var(--color-primary)]",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>
          {usedMB} MB of {maxGB} GB
        </span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default React.memo(QuotaWidget);
