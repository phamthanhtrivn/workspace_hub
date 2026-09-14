"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentViewType } from "../../types/documents.enums";
import { GridViewCard } from "./grid-view-card";

interface GridViewProps {
  items: DocumentItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onOpenItem: (item: DocumentItem) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onOpenDetails: (item: DocumentItem) => void;
  onRename: (item: DocumentItem) => void;
  onMove: (id: string) => void;
  onToggleStar: (item: DocumentItem) => void;
  onMoveToTrash: (item: DocumentItem) => void;
  onRestore: (item: DocumentItem) => void;
  onDeletePermanently: (item: DocumentItem) => void;
  onPreview?: (item: DocumentItem) => void;
  onDownload?: (item: DocumentItem) => void;
  onManageVersions?: (item: DocumentItem) => void;
  onShare?: (item: DocumentItem) => void;
  onShareToChat?: (item: DocumentItem) => void;
}

function GridView({
  items,
  selectedItemId,
  onSelectItem,
  onOpenItem,
  activeMenuId,
  setActiveMenuId,
  onOpenDetails,
  onRename,
  onMove,
  onToggleStar,
  onMoveToTrash,
  onRestore,
  onDeletePermanently,
  onPreview,
  onDownload,
  onManageVersions,
  onShare,
  onShareToChat,
}: GridViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-200">
      {items.map((item) => (
        <GridViewCard
          key={item.id}
          item={item}
          selectedItemId={selectedItemId}
          onSelect={onSelectItem}
          onFolderClick={onOpenItem}
          activeView={DocumentViewType.MY_FILES}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onRename={onRename}
          onMove={onMove}
          onToggleStar={onToggleStar}
          onMoveToTrash={onMoveToTrash}
          onRestore={onRestore}
          onViewDetails={onOpenDetails}
          onDeletePermanently={onDeletePermanently}
          onPreview={onPreview}
          onDownload={onDownload}
          onManageVersions={onManageVersions}
          onShare={onShare}
          onShareToChat={onShareToChat}
        />
      ))}
    </div>
  );
}

export default React.memo(GridView);
