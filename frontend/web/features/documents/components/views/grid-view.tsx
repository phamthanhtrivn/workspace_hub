"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentViewType } from "../../types/documents.enums";
import { GridViewCard } from "./grid-view-card";

interface GridViewProps {
  items: DocumentItem[];
  activeView: DocumentViewType;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onOpenItem: (item: DocumentItem) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onOpenDetails: (item: DocumentItem) => void;
  onRename: (item: DocumentItem) => void;
  onMove: (id: string) => void;
  onToggleStar?: (item: DocumentItem) => void;
  onMoveToTrash: (item: DocumentItem) => void;
  onRestore: (item: DocumentItem) => void;
  onDeletePermanently: (item: DocumentItem) => void;
  onPreview?: (item: DocumentItem) => void;
  onDownload?: (item: DocumentItem) => void;
  onDownloadFolder?: (item: DocumentItem) => void;
  onManageVersions?: (item: DocumentItem) => void;
  onShare?: (item: DocumentItem) => void;
  onShareToChat?: (item: DocumentItem) => void;
  isProjectDocuments?: boolean;
}

function GridView({
  items,
  activeView,
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
  onDownloadFolder,
  onManageVersions,
  onShare,
  onShareToChat,
  isProjectDocuments = false,
}: GridViewProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 animate-in fade-in duration-200 @min-[480px]/document-items:grid-cols-2 @min-[760px]/document-items:grid-cols-3 @min-[1040px]/document-items:grid-cols-4">
      {items.map((item) => (
        <GridViewCard
          key={item.id}
          item={item}
          selectedItemId={selectedItemId}
          onSelect={onSelectItem}
          onFolderClick={onOpenItem}
          activeView={activeView}
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
          onDownloadFolder={onDownloadFolder}
          onManageVersions={onManageVersions}
          onShare={onShare}
          onShareToChat={onShareToChat}
          isProjectDocuments={isProjectDocuments}
        />
      ))}
    </div>
  );
}

export default React.memo(GridView);
