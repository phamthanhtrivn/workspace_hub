"use client";

import React from "react";
import { Star } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DocumentItem } from "../../types/documents.types";
import { DocumentItemType, DocumentViewType } from "../../types/documents.enums";
import ItemActionsMenu from "../explorer/item-actions-menu";
import {
  formatBytes,
  formatDateShort,
  getDocumentDisplaySize,
} from "../../utils/documents.utils";
import { DocumentIcon } from "../common/document-icon";
import { DocumentsStatusBadge } from "../ui/documents-status-badge";
import { cn } from "@/lib/utils";

export interface ListViewRowProps {
  item: DocumentItem;
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  onFolderClick: (item: DocumentItem) => void;
  activeView: DocumentViewType;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onRename: (item: DocumentItem) => void;
  onMove: (id: string) => void;
  onToggleStar: (item: DocumentItem) => void;
  onMoveToTrash: (item: DocumentItem) => void;
  onRestore: (item: DocumentItem) => void;
  onViewDetails: (item: DocumentItem) => void;
  onDeletePermanently: (item: DocumentItem) => void;
  onPreview?: (item: DocumentItem) => void;
  onDownload?: (item: DocumentItem) => void;
  onDownloadFolder?: (item: DocumentItem) => void;
  onManageVersions?: (item: DocumentItem) => void;
  onShare?: (item: DocumentItem) => void;
  onShareToChat?: (item: DocumentItem) => void;
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
  onMoveToTrash,
  onRestore,
  onViewDetails,
  onDeletePermanently,
  onPreview,
  onDownload,
  onDownloadFolder,
  onManageVersions,
  onShare,
  onShareToChat,
}: ListViewRowProps) {
  const isFolder = item.type === DocumentItemType.FOLDER;
  const isSelected = item.id === selectedItemId;
  const isMenuOpen = activeMenuId === item.id;

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

  const style = {
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          opacity: isDragging ? 0.3 : undefined,
        }
      : {}),
    zIndex: isDragging ? 50 : isMenuOpen ? 30 : undefined,
    position: (isDragging || isMenuOpen) ? ("relative" as const) : undefined,
  };

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
        "hover:bg-slate-50/50 cursor-pointer select-none transition-colors border-b border-slate-100/60",
        isSelected && "bg-blue-50/40",
        isOver && "bg-blue-100/50 border-y-2 border-dashed border-blue-400"
      )}
    >
      <td className="p-4 flex items-center gap-3 min-w-0">
        <DocumentIcon item={item} iconSize={18} className="p-2 rounded-xl" />
        <span className="font-bold text-slate-700 truncate max-w-xs">
          {item.name}
        </span>
        {item.isStarred ? (
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0 ml-1" />
        ) : null}
      </td>
      <td className="p-4 hidden sm:table-cell">
        <DocumentsStatusBadge type="itemType" itemType={item.type} />
      </td>
      <td className="p-4 text-slate-500 font-semibold hidden md:table-cell">
        {formatDateShort(item.updatedAt)}
      </td>
      <td className="p-4 text-slate-500 font-semibold hidden lg:table-cell">
        {isFolder ? "—" : formatBytes(getDocumentDisplaySize(item))}
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <ItemActionsMenu
            item={item}
            activeView={activeView}
            activeMenuId={activeMenuId}
            setActiveMenuId={setActiveMenuId}
            onRename={() => onRename(item)}
            onMove={() => onMove(item.id)}
            onToggleStar={() => onToggleStar(item)}
            onArchive={(archive) => (archive ? onMoveToTrash(item) : onRestore(item))}
            onViewDetails={() => onViewDetails(item)}
            onDeletePermanently={() => onDeletePermanently(item)}
            onPreview={() => onPreview?.(item)}
            onDownload={() => onDownload?.(item)}
            onDownloadFolder={() => onDownloadFolder?.(item)}
            onManageVersions={() => onManageVersions?.(item)}
            onShare={() => onShare?.(item)}
            onShareToChat={() => onShareToChat?.(item)}
          />
        </div>
      </td>
    </tr>
  );
}

export default React.memo(ListViewRow);
