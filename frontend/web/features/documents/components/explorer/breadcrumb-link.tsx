"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DND_ROOT_ID } from "../../types/documents.constants";
import { NavigationLabel } from "../../types/documents.enums";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export interface BreadcrumbLinkProps {
  name: string;
  folderId: string | null;
  isActive: boolean;
  onClick: () => void;
}

export function BreadcrumbLink({ name, folderId, isActive, onClick }: BreadcrumbLinkProps) {
  const intl = useAppIntl();
  const { setNodeRef, isOver } = useDroppable({
    id: folderId === null ? DND_ROOT_ID : folderId,
  });
  const navigationLabelIds: Partial<Record<NavigationLabel | "Folder", string>> = {
    [NavigationLabel.ROOT]: "documents.nav.myFiles",
    [NavigationLabel.CURRENT_FOLDER]: "documents.currentFolder",
    [NavigationLabel.STARRED]: "documents.nav.starred",
    [NavigationLabel.SHARED]: "documents.nav.shared",
    [NavigationLabel.TRASH]: "documents.nav.trash",
    Folder: "documents.folder",
  };
  const labelId = navigationLabelIds[name as NavigationLabel | "Folder"];
  const displayName = labelId ? intl.formatMessage({ id: labelId }) : name;

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "font-semibold px-2 py-1 rounded-xl transition-all cursor-pointer",
        isActive ? "text-slate-800" : "text-slate-400 hover:text-[var(--color-primary)] hover:bg-slate-50",
        isOver && "bg-blue-50 text-blue-600 ring-2 ring-dashed ring-blue-400 scale-105 shadow-sm",
      )}
    >
      {displayName}
    </button>
  );
}
