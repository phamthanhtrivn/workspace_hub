"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DND_ROOT_ID } from "../../types/documents.constants";
import { NavigationLabel } from "../../types/documents.enums";

export interface BreadcrumbLinkProps {
  name: string;
  folderId: string | null;
  isActive: boolean;
  onClick: () => void;
}

export function BreadcrumbLink({ name, folderId, isActive, onClick }: BreadcrumbLinkProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: folderId === null ? DND_ROOT_ID : folderId,
  });
  const navigationLabels: Partial<Record<NavigationLabel | "Folder", string>> = {
    [NavigationLabel.ROOT]: "My files",
    [NavigationLabel.CURRENT_FOLDER]: "Current folder",
    [NavigationLabel.STARRED]: "Starred",
    [NavigationLabel.SHARED]: "Shared",
    [NavigationLabel.TRASH]: "Trash",
    Folder: "Folder",
  };
  const displayName = navigationLabels[name as NavigationLabel | "Folder"] || name;

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "font-bold text-xs px-2 py-1 rounded-md transition-all cursor-pointer",
        isActive ? "text-[#172B4D]" : "text-slate-400 hover:text-[#0052CC] hover:bg-slate-100",
        isOver && "bg-blue-50 text-[#0052CC] ring-2 ring-dashed ring-blue-400 scale-105 shadow-xs"
      )}
    >
      {displayName}
    </button>
  );
}

export default React.memo(BreadcrumbLink);
