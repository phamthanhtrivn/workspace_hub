"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentViewType } from "../../types/documents.enums";
import { ListViewRow } from "./list-view-row";

interface ListViewProps {
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
  onShareToChat?: (item: DocumentItem) => void;
}

function ListView({
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
  onShareToChat,
}: ListViewProps) {
  return (
    <div className="w-full border border-slate-100 rounded-2xl overflow-visible bg-white animate-in fade-in duration-200">
      <table className="w-full border-collapse text-left text-sm text-slate-700">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black text-xs uppercase tracking-wider">
          <tr>
            <th className="p-4 rounded-tl-2xl">Tên</th>
            <th className="p-4 hidden sm:table-cell">Ngày sửa</th>
            <th className="p-4 hidden md:table-cell">Dung lượng</th>
            <th className="p-4 w-10 rounded-tr-2xl"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <ListViewRow
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
              onManageVersions={onManageVersions}
              onShare={onShare}
              onDownloadFolder={onDownloadFolder}
              onShareToChat={onShareToChat}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(ListView);
