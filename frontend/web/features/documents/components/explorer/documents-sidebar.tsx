"use client";

import React from "react";
import { DOCUMENT_NAVIGATION_ITEMS } from "../../types/document-navigation.constants";
import { DocumentViewType } from "../../types/documents.enums";
import { DocumentsSidebarStoragePanel } from "./documents-sidebar-storage-panel";
import { FeatureSidebarItem } from "@/components/common/feature-sidebar-item";

export interface DocumentsSidebarProps {
  activeView: DocumentViewType;
  onViewChange: (view: DocumentViewType) => void;
}

export function DocumentsSidebar({
  activeView,
  onViewChange,
}: DocumentsSidebarProps) {
  return (
    <aside className="flex min-h-0 min-w-0 shrink-0 flex-col gap-5 border-b border-border bg-sidebar px-4 py-4 @min-[960px]/documents:w-80 @min-[960px]/documents:border-b-0 @min-[960px]/documents:border-r @min-[960px]/documents:py-6">
      <nav
        className="flex gap-1.5 overflow-x-auto @min-[960px]/documents:flex-col @min-[960px]/documents:overflow-visible"
        aria-label="Document Navigation"
      >
        {DOCUMENT_NAVIGATION_ITEMS.map((item) => (
          <FeatureSidebarItem
            key={item.id}
            icon={item.icon}
            iconClassName={item.iconClassName}
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
