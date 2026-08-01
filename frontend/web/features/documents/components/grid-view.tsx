"use client";

import React from "react";
import { Folder, FileText, Star } from "lucide-react";
import { DocumentItem } from "../types/documents.types";
import { DocumentItemType, DocumentViewType, ResourceTypeName } from "../types/documents.enums";
import ItemActionsMenu from "./item-actions-menu";
import { cn } from "@/lib/utils";

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
      {items.map((item) => {
        const isFolder = item.type === DocumentItemType.FOLDER;
        const isSelected = item.id === selectedItemId;
        return (
          <div
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              if (isFolder) {
                onFolderClick(item);
              } else {
                onSelect(item.id);
              }
            }}
            className={cn(
              "group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer select-none duration-300",
              isSelected
                ? "bg-blue-50/50 border-blue-200 ring-2 ring-blue-500/10 shadow-xs"
                : isFolder
                  ? "border-slate-100 hover:border-amber-200 hover:bg-amber-50/5 hover:-translate-y-1"
                  : "border-slate-100 hover:border-blue-100 hover:bg-blue-50/5 hover:-translate-y-1",
            )}
          >
            {/* Item Icon & Options */}
            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  "p-3 rounded-xl transition-all duration-300",
                  isSelected
                    ? isFolder
                      ? "bg-amber-100 text-amber-600"
                      : "bg-blue-100 text-blue-600"
                    : isFolder
                      ? "bg-amber-50 text-amber-500 group-hover:scale-105"
                      : "bg-blue-50 text-blue-500 group-hover:scale-105",
                )}
              >
                {isFolder ? <Folder size={22} /> : <FileText size={22} />}
              </div>

              {/* Item Actions Dropdown */}
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
              />
            </div>

            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <span className="block font-bold text-sm text-slate-700 truncate group-hover:text-slate-900">
                {item.name}
              </span>
              <span className="block text-xs text-slate-400 font-semibold mt-1">
                {isFolder ? ResourceTypeName.FOLDER : formatBytes(item.sizeBytes)}
              </span>
            </div>

            {/* Starred indicator */}
            {item.isStarred && (
              <div className="absolute bottom-4 right-4 text-amber-400">
                <Star size={15} className="fill-amber-400" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(GridView);
