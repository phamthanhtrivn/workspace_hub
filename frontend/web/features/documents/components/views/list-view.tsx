"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentViewType } from "../../types/documents.enums";
import { ListViewRow } from "./list-view-row";

interface ListViewProps {
  items: DocumentItem[];
  footer?: React.ReactNode;
  scrollContainerRef?: React.Ref<HTMLDivElement>;
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
  onDownloadFolder?: (item: DocumentItem) => void;
  onManageVersions?: (item: DocumentItem) => void;
  onShare?: (item: DocumentItem) => void;
  onShareToChat?: (item: DocumentItem) => void;
}

function ListView({
  items,
  footer,
  scrollContainerRef,
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
}: ListViewProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs animate-in fade-in duration-200">
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-700">
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <ListViewRow
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
                onDownloadFolder={onDownloadFolder}
                onManageVersions={onManageVersions}
                onShare={onShare}
                onShareToChat={onShareToChat}
              />
            ))}
          </tbody>
        </table>
        {footer}
      </div>
    </div>
  );
}

export default React.memo(ListView);
