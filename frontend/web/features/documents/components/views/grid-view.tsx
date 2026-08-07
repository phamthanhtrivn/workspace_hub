"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentViewType } from "../../types/documents.enums";
import { GridViewCard } from "./grid-view-card";

interface GridViewProps {
  items: DocumentItem[];
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  onFolderClick: (item: DocumentItem) => void;
  activeView: DocumentViewType;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string) => void;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onArchive: (id: string, archive: boolean) => void;
  onViewDetails: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onPreview?: (item: DocumentItem) => void;
  onDownload?: (item: DocumentItem) => void;
  onManageVersions?: (item: DocumentItem) => void;
  onShare?: (item: DocumentItem) => void;
  onDownloadFolder?: (item: DocumentItem) => void;
}

function GridView({
  items,
  selectedItemId,
  onSelect,
  onFolderClick,
  activeView,
  activeMenuId,
  setActiveMenuId,
  onRename,
  onMove,
  onToggleStar,
  onArchive,
  onViewDetails,
  onDeletePermanently,
  onPreview,
  onDownload,
  onManageVersions,
  onShare,
  onDownloadFolder,
}: GridViewProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
      {items.map((item) => (
        <GridViewCard
          key={item.id}
          item={item}
          selectedItemId={selectedItemId}
          onSelect={onSelect}
          onFolderClick={onFolderClick}
          activeView={activeView}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onRename={onRename}
          onMove={onMove}
          onToggleStar={onToggleStar}
          onArchive={onArchive}
          onViewDetails={onViewDetails}
          onDeletePermanently={onDeletePermanently}
          onPreview={onPreview}
          onDownload={onDownload}
          onDownloadFolder={onDownloadFolder}
          onManageVersions={onManageVersions}
          onShare={onShare}
          formatBytes={formatBytes}
        />
      ))}
    </div>
  );
}

export default React.memo(GridView);
