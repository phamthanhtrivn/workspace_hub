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
          "gap-1 border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600 rounded-lg",
          className
        )}
      >
        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
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
          "gap-1 border-slate-200/60 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500 rounded-lg",
          className
        )}
      >
        {isFolder ? (
          <>
            <Folder className="h-3 w-3 text-amber-500" />
            <span>Folder</span>
          </>
        ) : (
          <>
            <FileText className="h-3 w-3 text-blue-500" />
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
          "gap-1 border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-600 rounded-lg",
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
          "gap-1 border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 rounded-lg",
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
        "gap-1 border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600 rounded-lg",
        className
      )}
    >
      <Eye className="h-3 w-3" />
      <span>Viewer</span>
    </Badge>
  );
}
