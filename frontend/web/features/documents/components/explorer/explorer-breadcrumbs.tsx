"use client";

import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { BreadcrumbLink } from "./breadcrumb-link";
import { Button } from "@/components/ui/button";

interface ExplorerBreadcrumbsProps {
  path: { id: string | null; name: string }[];
  onBreadcrumbClick: (index: number) => void;
  onBackToParent?: () => void;
  allowRootDrop?: boolean;
  isStarred?: boolean;
}

export function ExplorerBreadcrumbs({
  path,
  onBreadcrumbClick,
  onBackToParent,
  allowRootDrop = true,
  isStarred = false,
}: ExplorerBreadcrumbsProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1 break-all text-sm font-semibold text-foreground">
      {path.length > 1 && onBackToParent ? (
        <Button
          variant="unstyled"
          aria-label="Open parent folder"
          type="button"
          onClick={onBackToParent}
          className="relative focus-visible:z-10 p-1.5 hover:bg-muted rounded-control text-muted-foreground hover:text-foreground transition mr-2 cursor-pointer border border-border"
        >
          <ArrowLeft size={15} />
        </Button>
      ) : null}

      {path.map((p, idx) => (
        <React.Fragment key={p.id ?? "root-crumb"}>
          {idx > 0 && (
            <ChevronRight size={14} className="text-muted-foreground mx-1" />
          )}
          <BreadcrumbLink
            name={p.name}
            folderId={p.id}
            allowRootDrop={allowRootDrop}
            isStarred={isStarred}
            isActive={idx === path.length - 1}
            onClick={() => onBreadcrumbClick(idx)}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export default React.memo(ExplorerBreadcrumbs);
