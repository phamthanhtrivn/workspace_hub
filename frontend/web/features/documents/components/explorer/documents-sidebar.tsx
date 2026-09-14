"use client";

import React from "react";
import { Folder, Share2, Star, Trash2 } from "lucide-react";
import { DocumentViewType } from "../../types/documents.enums";
import { DocumentsSidebarStoragePanel } from "./documents-sidebar-storage-panel";
import { cn } from "@/lib/utils";

export interface DocumentsSidebarProps {
  activeView: DocumentViewType;
  onViewChange: (view: DocumentViewType) => void;
}

export function DocumentsSidebar({ activeView, onViewChange }: DocumentsSidebarProps) {
  const navItems = [
    {
      id: DocumentViewType.MY_FILES,
      label: "My files",
      icon: Folder,
    },
    {
      id: DocumentViewType.SHARED,
      label: "Shared",
      icon: Share2,
    },
    {
      id: DocumentViewType.STARRED,
      label: "Starred",
      icon: Star,
    },
    {
      id: DocumentViewType.TRASH,
      label: "Trash",
      icon: Trash2,
    },
  ];

  return (
    <aside className="flex shrink-0 flex-col gap-5 border-b border-slate-200 bg-white/90 px-4 py-4 shadow-[0_12px_32px_rgba(15,40,84,0.06)] xl:w-80 xl:border-b-0 xl:border-r xl:py-6">
      <nav
        className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible"
        aria-label="Document Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "cursor-pointer flex h-12 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]",
                isActive
                  ? "bg-[#0052CC] text-white shadow-[0_12px_28px_rgba(0,82,204,0.22)]"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                  isActive ? "bg-white/16 text-white" : "bg-slate-50 text-slate-500"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <DocumentsSidebarStoragePanel />
    </aside>
  );
}

export default React.memo(DocumentsSidebar);
