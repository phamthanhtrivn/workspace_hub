"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DND_ROOT_ID } from "../../types/documents.constants";

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
      {name}
    </button>
  );
}
