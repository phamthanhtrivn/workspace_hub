"use client";
import { NativeCheckbox } from "@/components/ui/checkbox";

import { Button } from "@/components/ui/button";
import React from "react";
import type { DocumentMultiSelection } from "../../types/document-bulk.types";
import { Star } from "lucide-react";
import { useDraggable, useDroppable, useDndContext } from "@dnd-kit/core";
import { DocumentItem } from "../../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
} from "../../types/documents.enums";
import ItemActionsMenu from "../explorer/item-actions-menu";
import { DocumentIcon } from "../common/document-icon";
import { DocumentsCard } from "../ui/documents-card";
import { DocumentsStatusBadge } from "../ui/documents-status-badge";
import { DocumentProjectBadge } from "../ui/document-project-badge";
import { formatBytes } from "../../utils/documents.utils";
import {
  getBulkItemBlockReason,
  getMoveDestinationBlockReason,
} from "../../utils/document-bulk";
import { DocumentBulkAction } from "../../types/document-bulk.types";
import { isProjectRootFolder } from "../../utils/project-documents";

export interface GridViewCardProps {
  item: DocumentItem;
  selection?: DocumentMultiSelection;
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
  selection,
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
  const isSelected = selection
    ? selection.selectedIds.has(item.id)
    : item.id === selectedItemId;
  const isMenuOpen = activeMenuId === item.id;
  const { active } = useDndContext();
  const draggingDocument = active?.data.current?.document as
    DocumentItem | undefined;
  const dropBlocked = draggingDocument
    ? getMoveDestinationBlockReason(
        item,
        draggingDocument.projectId ?? undefined,
        [draggingDocument.id],
      )
    : undefined;
  const moveBlocked = getBulkItemBlockReason(item, DocumentBulkAction.MOVE);

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { document: item },
    disabled: !!selection || !!moveBlocked || isProjectRootFolder(item),
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: item.id,
    disabled:
      !!selection ||
      !isFolder ||
      !!dropBlocked ||
      !!getMoveDestinationBlockReason(item, item.projectId ?? undefined),
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
    zIndex: isDragging
      ? 50
      : isMenuOpen
        ? 30
        : isSelected || isOver
          ? 10
          : undefined,
    position: "relative" as const,
  };

  return (
    <div
      ref={setCombinedRef}
      style={style}
      className="relative focus-within:z-20"
    >
      <DocumentsCard
        selected={isSelected}
        isDraggingOver={isOver}
        onClick={(e) => {
          e.stopPropagation();
          if (selection) selection.onToggle(item);
          else onSelect(item.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (selection) return;
          if (isFolder) {
            onFolderClick(item);
          } else {
            onPreview?.(item);
          }
        }}
        className={`group flex h-full min-h-40 flex-col justify-between select-none cursor-pointer border-border hover:border-border hover:bg-warning-soft/10 ${
          isFolder && (dropBlocked || isProjectRootFolder(item)) ? "opacity-40" : ""
        }`}
      >
        {/* Header Icon & Menu */}
        <div className="flex items-start justify-between">
          <Button
            type="button"
            variant="unstyled"
            ref={setActivatorNodeRef}
            disabled={selection ? selection.disabled : !!moveBlocked}
            className="relative rounded-panel focus-visible:z-10"
            {...attributes}
            {...listeners}
            aria-label={selection ? `Select ${item.name}` : `Drag ${item.name}`}
            onClick={(e) => {
              if (selection) {
                e.stopPropagation();
                selection.onToggle(item);
              }
            }}
          >
            <DocumentIcon
              item={item}
              iconSize={22}
              isSelected={isSelected}
              className="p-3 rounded-panel transition-all duration-200"
            />
          </Button>

          {selection ? (
            <NativeCheckbox
              aria-label={`Select ${item.name}`}
              checked={isSelected}
              disabled={selection.disabled}
              onClick={(e) => e.stopPropagation()}
              onChange={() => selection.onToggle(item)}
              className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
            />
          ) : (
            <ItemActionsMenu
              item={item}
              activeView={activeView}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onRename={() => onRename(item)}
              onMove={() => onMove(item.id)}
              onToggleStar={onToggleStar ? () => onToggleStar(item) : undefined}
              onArchive={(archive) =>
                archive ? onMoveToTrash(item) : onRestore(item)
              }
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
          )}
        </div>

        {/* Info Body */}
        <div className="min-w-0 mt-3 flex-1">
          <h4>
            <Button
              variant="unstyled"
              type="button"
              className="relative block w-full truncate rounded-xs text-left text-sm font-semibold text-foreground focus-visible:z-10"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (selection) selection.onToggle(item);
                else if (isFolder) onFolderClick(item);
                else onPreview?.(item);
              }}
            >
              {item.name}
            </Button>
          </h4>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">
            {isFolder ? "Folder" : formatBytes(item.sizeBytes)}
          </p>
        </div>

        {/* Footer Indicators */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 pt-2">
          <DocumentsStatusBadge type="itemType" itemType={item.type} />
          {item.projectId ? (
            <DocumentProjectBadge projectId={item.projectId} />
          ) : null}
          {!isProjectDocuments && !item.projectId && item.isStarred ? (
            <Star className="h-3.5 w-3.5 fill-warning-content text-warning-content" />
          ) : null}
        </div>
      </DocumentsCard>
    </div>
  );
}

export default React.memo(GridViewCard);
