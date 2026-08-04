"use client";

import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface ExplorerBreadcrumbsProps {
  path: { id: string | null; name: string }[];
  onBreadcrumbClick: (index: number) => void;
  onBackToParent: () => void;
}

function ExplorerBreadcrumbs({
  path,
  onBreadcrumbClick,
  onBackToParent,
}: ExplorerBreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 px-6 py-4 border-b border-slate-50 bg-slate-50/10 text-sm">
      {path.length > 1 && (
        <button
          onClick={onBackToParent}
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors mr-2 cursor-pointer"
        >
          <ArrowLeft size={15} />
        </button>
      )}

      {path.map((p, idx) => (
        <React.Fragment key={p.id ?? "root-crumb"}>
          {idx > 0 && (
            <ChevronRight size={14} className="text-slate-300 mx-1" />
          )}
          <button
            onClick={() => onBreadcrumbClick(idx)}
            className={cn(
              "font-semibold hover:text-[var(--color-primary)] transition-colors cursor-pointer",
              idx === path.length - 1 ? "text-slate-800" : "text-slate-400",
            )}
          >
            {p.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default React.memo(ExplorerBreadcrumbs);
