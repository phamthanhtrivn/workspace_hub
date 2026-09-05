import React from "react";
import { Users } from "lucide-react";

export interface WorkloadItem {
  name: string;
  count: number;
}

interface MemberWorkloadListProps {
  items: WorkloadItem[];
  maxCount: number;
  emptyMessage?: string;
  barColor?: string;
}

export function MemberWorkloadList({
  items,
  maxCount,
  emptyMessage = "Chưa có công việc được phân công.",
  barColor = "bg-slate-500",
}: MemberWorkloadListProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-xs font-semibold text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  const safeMax = Math.max(1, maxCount);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.name}
          className="grid grid-cols-[120px_1fr_28px] items-center gap-3 text-xs"
        >
          <span className="flex min-w-0 items-center gap-2 truncate text-slate-600">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {item.name}
          </span>
          <div className="h-5 rounded-sm bg-slate-100">
            <div
              className={`h-5 rounded-sm ${barColor}`}
              style={{ width: `${(item.count / safeMax) * 100}%` }}
            />
          </div>
          <strong className="text-right text-slate-700">{item.count}</strong>
        </div>
      ))}
    </div>
  );
}
