"use client";

import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { BreadcrumbLink } from "./breadcrumb-link";

interface ExplorerBreadcrumbsProps {
  path: { id: string | null; name: string }[];
  onBreadcrumbClick: (index: number) => void;
  onBackToParent?: () => void;
}

export function ExplorerBreadcrumbs({
  path,
  onBreadcrumbClick,
  onBackToParent,
}: ExplorerBreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
      {path.length > 1 && onBackToParent ? (
        <button
          type="button"
          onClick={onBackToParent}
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition mr-2 cursor-pointer border border-slate-100"
        >
          <ArrowLeft size={15} />
        </button>
      ) : null}

      {path.map((p, idx) => (
        <React.Fragment key={p.id ?? "root-crumb"}>
          {idx > 0 && (
            <ChevronRight size={14} className="text-slate-300 mx-1" />
          )}
          <BreadcrumbLink
            name={p.name}
            folderId={p.id}
            isActive={idx === path.length - 1}
            onClick={() => onBreadcrumbClick(idx)}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export default React.memo(ExplorerBreadcrumbs);
