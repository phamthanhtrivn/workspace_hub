"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentViewType } from "../../types/documents.enums";
import { ListViewRow } from "./list-view-row";

interface ListViewProps {
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

function ListView({
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
}: ListViewProps) {
  return (
    <div className="w-full border border-slate-100 rounded-2xl overflow-hidden bg-white animate-in fade-in duration-200 shadow-xs">
      <table className="w-full border-collapse text-left text-sm text-slate-700">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black text-xs uppercase tracking-wider">
          <tr>
            <th className="p-4">Name</th>
            <th className="p-4 hidden sm:table-cell">Type</th>
            <th className="p-4 hidden md:table-cell">Modified</th>
            <th className="p-4 hidden lg:table-cell">Size</th>
            <th className="p-4 w-10 text-right"></th>
          </tr>
        </thead>
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
              onManageVersions={onManageVersions}
              onShare={onShare}
              onShareToChat={onShareToChat}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(ListView);
