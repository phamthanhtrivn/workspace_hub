"use client";

import React from "react";
import { Folder, Share2, Star, Trash2 } from "lucide-react";
import { DocumentViewType } from "../../types/documents.enums";
import { DocumentsSidebarStoragePanel } from "./documents-sidebar-storage-panel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


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
    <aside className="flex shrink-0 flex-col gap-5 border-b border-border bg-sidebar px-4 py-4 @min-[960px]/documents:w-80 @min-[960px]/documents:border-b-0 @min-[960px]/documents:border-r @min-[960px]/documents:py-6">
      <nav
        className="flex gap-2 overflow-x-auto @min-[960px]/documents:flex-col @min-[960px]/documents:overflow-visible"
        aria-label="Document Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <Button variant="unstyled"
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "cursor-pointer flex h-12 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                  isActive ? "bg-transparent text-primary-soft-foreground" : "bg-background text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <DocumentsSidebarStoragePanel />
    </aside>
  );
}

export default React.memo(DocumentsSidebar);
