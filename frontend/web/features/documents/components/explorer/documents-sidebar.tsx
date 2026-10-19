"use client";

import React from "react";
import { Folder, Share2, Star, Trash2 } from "lucide-react";
import { DocumentViewType } from "../../types/documents.enums";
import { DocumentsSidebarStoragePanel } from "./documents-sidebar-storage-panel";
import { FeatureSidebarItem } from "@/components/common/feature-sidebar-item";


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
    <aside className="flex min-h-0 min-w-0 shrink-0 flex-col gap-5 border-b border-border bg-sidebar px-4 py-4 @min-[960px]/documents:w-80 @min-[960px]/documents:border-b-0 @min-[960px]/documents:border-r @min-[960px]/documents:py-6">
      <nav
        className="flex gap-1.5 overflow-x-auto @min-[960px]/documents:flex-col @min-[960px]/documents:overflow-visible"
        aria-label="Document Navigation"
      >
        {navItems.map((item) => (
          <FeatureSidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </nav>

      <DocumentsSidebarStoragePanel />
    </aside>
  );
}

export default React.memo(DocumentsSidebar);
