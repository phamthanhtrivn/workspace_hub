import React from "react";

interface ProjectMetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  sublabel?: string;
  color: string;
}

export function ProjectMetricCard({
  icon: Icon,
  value,
  label,
  sublabel,
  color,
}: ProjectMetricCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:shadow-md">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-[#172B4D]">{value}</p>
        {sublabel && (
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {sublabel}
          </p>
        )}
      </div>
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
