import React from "react";

interface ProjectSummaryPanelProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ProjectSummaryPanel({
  title,
  description,
  children,
}: ProjectSummaryPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-[#172B4D]">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
