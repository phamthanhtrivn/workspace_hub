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
    <div className="flex items-center justify-between rounded-panel border border-border bg-card p-4 transition-all duration-200">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        {sublabel && (
          <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
            {sublabel}
          </p>
        )}
      </div>
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-panel ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
