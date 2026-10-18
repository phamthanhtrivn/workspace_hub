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
        <Loader2 className="animate-spin text-muted-foreground" size={16} />
      </div>
    );
  }

  if (!quota) return null;

  return (
    <div className="rounded-panel border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <HardDrive size={18} className="text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          STORAGE USED
        </span>
      </div>

      <div className="w-full bg-accent rounded-full h-2 mb-2 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-200",
            percentage > 90
              ? "bg-destructive-content"
              : percentage > 75
                ? "bg-warning-content"
                : "bg-link",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {usedMB} MB of {maxGB} GB
        </span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default React.memo(QuotaWidget);
