"use client";

import React from "react";
import { Star } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DocumentItem } from "../../types/documents.types";
import { DocumentItemType, DocumentViewType, ResourceTypeName } from "../../types/documents.enums";
import ItemActionsMenu from "../explorer/item-actions-menu";
import { cn } from "@/lib/utils";
import { DocumentIcon } from "../common/document-icon";

export interface GridViewCardProps {
  item: DocumentItem;
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
  formatBytes: (bytes: number) => string;
}

export function GridViewCard({
  item,
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
  formatBytes,
}: GridViewCardProps) {
  const isFolder = item.type === DocumentItemType.FOLDER;
  const isSelected = item.id === selectedItemId;

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: item.id,
    disabled: !isFolder,
  });

  const setCombinedRef = (node: HTMLDivElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.3 : undefined,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setCombinedRef}
      style={style}
      {...attributes}
      {...listeners}
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
        "group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer select-none duration-300",
        isSelected
          ? "bg-blue-50/50 border-blue-200 ring-2 ring-blue-500/10 shadow-xs"
          : isFolder
            ? "border-slate-100 hover:border-amber-200 hover:bg-amber-50/5"
            : "border-slate-100 hover:border-blue-100 hover:bg-blue-50/5",
        isOver && "border-2 border-dashed border-blue-400 bg-blue-50/20 scale-102",
      )}
    >
      {/* Item Icon & Options */}
      <div className="flex items-start justify-between mb-3">
        <DocumentIcon
          item={item}
          iconSize={22}
          isSelected={isSelected}
          className="p-3 rounded-xl transition-all duration-300"
        />

        {/* Item Actions Dropdown */}
        <ItemActionsMenu
          item={item}
          activeView={activeView}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onRename={() => onRename(item.id, item.name)}
          onMove={() => onMove(item.id)}
          onToggleStar={() => onToggleStar(item.id, item.isStarred)}
          onArchive={(archive: boolean) => onArchive(item.id, archive)}
          onViewDetails={() => onViewDetails(item.id)}
          onDeletePermanently={() => onDeletePermanently(item.id)}
          onPreview={() => onPreview?.(item)}
          onDownload={() => onDownload?.(item)}
          onDownloadFolder={() => onDownloadFolder?.(item)}
          onManageVersions={() => onManageVersions?.(item)}
          onShare={() => onShare?.(item)}
          onShareToChat={() => onShareToChat?.(item)}
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
}
