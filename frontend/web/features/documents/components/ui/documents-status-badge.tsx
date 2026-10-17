"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Star, ShieldCheck, Edit2, Eye, Folder, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentRole, DocumentItemType } from "../../types/documents.enums";

export interface DocumentsStatusBadgeProps {
  type?: "role" | "itemType" | "starred";
  role?: DocumentRole | string;
  itemType?: DocumentItemType | string;
  className?: string;
}

export function DocumentsStatusBadge({
  type = "role",
  role,
  itemType,
  className,
}: DocumentsStatusBadgeProps) {
  if (type === "starred") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-border bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning rounded-lg",
          className
        )}
      >
        <Star className="h-3 w-3 fill-warning text-warning" />
        <span>Starred</span>
      </Badge>
    );
  }

  if (type === "itemType") {
    const isFolder = itemType === DocumentItemType.FOLDER || itemType === "FOLDER";
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-border bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground rounded-lg",
          className
        )}
      >
        {isFolder ? (
          <>
            <Folder className="h-3 w-3 text-warning" />
            <span>Folder</span>
          </>
        ) : (
          <>
            <FileText className="h-3 w-3 text-info" />
            <span>File</span>
          </>
        )}
      </Badge>
    );
  }

  // Role Badge
  const normalizedRole = (role || "").toUpperCase();
  if (normalizedRole === DocumentRole.OWNER || normalizedRole === "OWNER") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-border bg-info-soft px-2 py-0.5 text-xs font-semibold text-info rounded-lg",
          className
        )}
      >
        <ShieldCheck className="h-3 w-3" />
        <span>Owner</span>
      </Badge>
    );
  }

  if (normalizedRole === DocumentRole.EDITOR || normalizedRole === "EDITOR") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-border bg-success-soft px-2 py-0.5 text-xs font-semibold text-success rounded-lg",
          className
        )}
      >
        <Edit2 className="h-3 w-3" />
        <span>Editor</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-border bg-info-soft px-2 py-0.5 text-xs font-semibold text-info rounded-lg",
        className
      )}
    >
      <Eye className="h-3 w-3" />
      <span>Viewer</span>
    </Badge>
  );
}
