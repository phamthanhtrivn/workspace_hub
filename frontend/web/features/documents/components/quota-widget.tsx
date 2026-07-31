"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import { HardDrive, Loader2 } from "lucide-react";

export default function QuotaWidget() {
  const { data: quota, isLoading } = useQuery({
    queryKey: ["document-quota"],
    queryFn: documentsApi.getQuota,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-slate-400" size={16} />
      </div>
    );
  }

  if (!quota) return null;

  const used = Number(quota.usedBytes);
  const max = Number(quota.maxBytes);

  // Compute values in MB and GB
  const usedMB = (used / 1024 / 1024).toFixed(1);
  const maxGB = (max / 1024 / 1024 / 1024).toFixed(0);

  const percentage = Math.min(100, Math.max(0, (used / max) * 100));

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2 text-slate-600 mb-2">
        <HardDrive size={18} className="text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Bộ nhớ đã dùng</span>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percentage > 90
              ? "bg-red-500"
              : percentage > 75
              ? "bg-amber-500"
              : "bg-[var(--color-primary)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>{usedMB} MB của {maxGB} GB</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}
