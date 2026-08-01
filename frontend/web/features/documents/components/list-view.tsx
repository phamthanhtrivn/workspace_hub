"use client";

import React from "react";
import { Folder, FileText, Star } from "lucide-react";
import { DocumentItem } from "../types/documents.types";
import { DocumentItemType, DocumentViewType } from "../types/documents.enums";
import ItemActionsMenu from "./item-actions-menu";
import { formatBytes, formatDateShort } from "../utils/documents.utils";

import { cn } from "@/lib/utils";

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
          {items.map((item) => {
            const isFolder = item.type === DocumentItemType.FOLDER;
            const isSelected = item.id === selectedItemId;
            return (
              <tr
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (isFolder) {
                    onFolderClick(item);
                  } else {
                    onPreview?.(item);
                  }
                }}
                className={cn(
                  "hover:bg-slate-50/50 cursor-pointer",
                  isSelected && "bg-blue-50/30",
                )}
              >
                <td className="p-4 flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isFolder
                        ? "bg-amber-50 text-amber-500"
                        : "bg-blue-50 text-blue-500",
                    )}
                  >
                    {isFolder ? <Folder size={18} /> : <FileText size={18} />}
                  </div>
                  <span className="font-bold text-slate-700 truncate max-w-[250px]">
                    {item.name}
                  </span>
                  {item.isStarred && (
                    <Star
                      size={14}
                      className="fill-amber-400 text-amber-400 shrink-0 ml-1"
                    />
                  )}
                </td>
                <td className="p-4 text-slate-500 font-medium hidden sm:table-cell">
                  {formatDateShort(item.updatedAt)}
                </td>
                <td className="p-4 text-slate-500 font-medium hidden md:table-cell">
                  {isFolder ? "--" : formatBytes(item.sizeBytes)}
                </td>
                <td className="p-4 text-right">
                  <ItemActionsMenu
                    item={item}
                    activeView={activeView}
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    onRename={() => onRename(item.id, item.name)}
                    onMove={() => onMove(item.id)}
                    onToggleStar={() => onToggleStar(item.id, item.isStarred)}
                    onArchive={(archive) => onArchive(item.id, archive)}
                    onViewDetails={() => onViewDetails(item.id)}
                    onDeletePermanently={() => onDeletePermanently(item.id)}
                    onPreview={() => onPreview?.(item)}
                    onDownload={() => onDownload?.(item)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(ListView);
