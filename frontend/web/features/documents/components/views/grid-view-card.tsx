"use client";

import React from "react";
import { Star } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DocumentItem } from "../../types/documents.types";
import { DocumentItemType, DocumentViewType } from "../../types/documents.enums";
import ItemActionsMenu from "../explorer/item-actions-menu";
import { DocumentIcon } from "../common/document-icon";
import { DocumentsCard } from "../ui/documents-card";
import { DocumentsStatusBadge } from "../ui/documents-status-badge";
import { formatBytes } from "../../utils/documents.utils";

export interface GridViewCardProps {
  item: DocumentItem;
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  onFolderClick: (item: DocumentItem) => void;
  activeView: DocumentViewType;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onRename: (item: DocumentItem) => void;
  onMove: (id: string) => void;
  onToggleStar?: (item: DocumentItem) => void;
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
  isProjectDocuments?: boolean;
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
  isProjectDocuments = false,
}: GridViewCardProps) {
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

  const setCombinedRef = (node: HTMLDivElement | null) => {
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
    <div ref={setCombinedRef} style={style} {...attributes} {...listeners}>
      <DocumentsCard
        selected={isSelected}
        isDraggingOver={isOver}
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
        className="group flex flex-col justify-between h-40 select-none cursor-pointer border-slate-100 hover:border-amber-200/80 hover:bg-amber-50/10"
      >
        {/* Header Icon & Menu */}
        <div className="flex items-start justify-between">
          <DocumentIcon
            item={item}
            iconSize={22}
            isSelected={isSelected}
            className="p-3 rounded-xl transition-all duration-300"
          />

          <ItemActionsMenu
            item={item}
            activeView={activeView}
            activeMenuId={activeMenuId}
            setActiveMenuId={setActiveMenuId}
            onRename={() => onRename(item)}
            onMove={() => onMove(item.id)}
            onToggleStar={onToggleStar ? () => onToggleStar(item) : undefined}
            onArchive={(archive) => (archive ? onMoveToTrash(item) : onRestore(item))}
            onViewDetails={() => onViewDetails(item)}
            onDeletePermanently={() => onDeletePermanently(item)}
            onPreview={() => onPreview?.(item)}
            onDownload={() => onDownload?.(item)}
            onDownloadFolder={() => onDownloadFolder?.(item)}
            onManageVersions={() => onManageVersions?.(item)}
            onShare={() => onShare?.(item)}
            onShareToChat={() => onShareToChat?.(item)}
            isProjectDocuments={isProjectDocuments}
          />
        </div>

        {/* Info Body */}
        <div className="min-w-0 mt-3 flex-1">
          <h4 className="truncate font-bold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
            {item.name}
          </h4>
          <p className="mt-1 text-xs text-slate-400 font-semibold">
            {isFolder ? "Folder" : formatBytes(item.sizeBytes)}
          </p>
        </div>

        {/* Footer Indicators */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <DocumentsStatusBadge type="itemType" itemType={item.type} />
          {!isProjectDocuments && item.isStarred ? (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
      </DocumentsCard>
    </div>
  );
}

export default React.memo(GridViewCard);
