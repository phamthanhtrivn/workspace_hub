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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`grid h-9 w-9 place-items-center rounded-md ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold text-[#172B4D]">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {sublabel && (
        <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p>
      )}
    </div>
  );
}
