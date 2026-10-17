import React from "react";

interface ProjectSummaryPanelProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  contentClassName?: string;
  heightClass?: string;
}

export function ProjectSummaryPanel({
  title,
  description,
  children,
  icon: Icon,
  className = "",
  contentClassName = "",
  heightClass = "h-[260px]",
}: ProjectSummaryPanelProps) {
  return (
    <section
      className={`flex flex-col rounded-panel border border-border bg-card p-5 transition-all duration-200 ${heightClass} ${className}`}
    >
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className={`mt-4 flex-1 min-h-0 overflow-y-auto pr-1.5 ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
}
