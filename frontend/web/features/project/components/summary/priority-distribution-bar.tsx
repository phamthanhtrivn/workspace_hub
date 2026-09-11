import React from "react";

export interface PriorityItem {
  label: string;
  value: number;
  color: string;
}

interface PriorityDistributionBarProps {
  items: PriorityItem[];
  maxValue: number;
}

export function PriorityDistributionBar({
  items,
  maxValue,
}: PriorityDistributionBarProps) {
  const safeMax = Math.max(1, maxValue);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[70px_1fr_28px] items-center gap-3 text-xs"
        >
          <span className="text-slate-600">{item.label}</span>
          <div className="h-5 rounded-sm bg-slate-100">
            <div
              className={`h-5 rounded-sm ${item.color}`}
              style={{ width: `${(item.value / safeMax) * 100}%` }}
            />
          </div>
          <strong className="text-right text-slate-700">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
