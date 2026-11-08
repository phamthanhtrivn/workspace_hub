"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useDocumentBreadcrumbDrop } from "../../hooks/useDocumentBreadcrumbDrop";
import { NavigationLabel } from "../../types/documents.enums";
import { Button } from "@/components/ui/button";

export interface BreadcrumbLinkProps {
  name: string;
  folderId: string | null;
  isActive: boolean;
  onClick: () => void;
  allowRootDrop?: boolean;
}

export function BreadcrumbLink({
  name,
  folderId,
  isActive,
  onClick,
  allowRootDrop = true,
}: BreadcrumbLinkProps) {
  const navigationLabels: Partial<Record<NavigationLabel | "Folder", string>> =
    {
      [NavigationLabel.ROOT]: "My files",
      [NavigationLabel.CURRENT_FOLDER]: "Current folder",
      [NavigationLabel.STARRED]: "Starred",
      [NavigationLabel.SHARED]: "Shared",
      [NavigationLabel.TRASH]: "Trash",
      Folder: "Folder",
    };
  const displayName =
    navigationLabels[name as NavigationLabel | "Folder"] || name;
  const { setNodeRef, isOver, blockedReason } = useDocumentBreadcrumbDrop(
    folderId,
    displayName,
    allowRootDrop,
  );

  return (
    <Button
      variant="unstyled"
      ref={setNodeRef}
      onClick={onClick}
      title={blockedReason}
      className={cn(
        "relative focus-visible:z-10 font-semibold text-xs px-2 py-1 rounded-md transition-all cursor-pointer",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-info-content hover:bg-muted",
        isOver &&
          "z-10 bg-info-soft text-info-content ring-2 ring-dashed ring-ring scale-105",
      )}
    >
      {displayName}
    </Button>
  );
}

export default React.memo(BreadcrumbLink);
