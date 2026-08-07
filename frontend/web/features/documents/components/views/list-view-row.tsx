"use client";

import React from "react";
import { Folder, FileText, Star } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DocumentItem } from "../../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
} from "../../types/documents.enums";
import ItemActionsMenu from "../explorer/item-actions-menu";
import { formatBytes, formatDateShort } from "../../utils/documents.utils";
import { cn } from "@/lib/utils";

export interface ListViewRowProps {
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
}

export function ListViewRow({
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
}: ListViewRowProps) {
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

  const setCombinedRef = (node: HTMLTableRowElement | null) => {
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
    <tr
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
        "hover:bg-slate-50/50 cursor-pointer select-none transition-colors",
        isSelected && "bg-blue-50/30",
        isOver && "bg-blue-100/50 border-y-2 border-dashed border-blue-400",
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
        {formatBytes(item.sizeBytes)}
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
          onArchive={(archive: boolean) => onArchive(item.id, archive)}
          onViewDetails={() => onViewDetails(item.id)}
          onDeletePermanently={() => onDeletePermanently(item.id)}
          onPreview={() => onPreview?.(item)}
          onDownload={() => onDownload?.(item)}
          onDownloadFolder={() => onDownloadFolder?.(item)}
          onManageVersions={() => onManageVersions?.(item)}
          onShare={() => onShare?.(item)}
        />
      </td>
    </tr>
  );
}
