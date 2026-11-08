"use client";
import { Checkbox } from "@/components/ui/checkbox";

import { Button } from "@/components/ui/button";
import React from "react";
import type { DocumentMultiSelection } from "../../types/document-bulk.types";
import { Star } from "lucide-react";
import { useDocumentItemDragAndDrop } from "../../hooks/useDocumentItemDragAndDrop";
import { DocumentItem } from "../../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
} from "../../types/documents.enums";
import ItemActionsMenu from "../explorer/item-actions-menu";
import {
  formatBytes,
  formatDateShort,
  getDocumentDisplaySize,
} from "../../utils/documents.utils";
import { DocumentIcon } from "../common/document-icon";
import { DocumentsStatusBadge } from "../ui/documents-status-badge";
import { DocumentProjectBadge } from "../ui/document-project-badge";
import { cn } from "@/lib/utils";
import { TableRow, TableCell } from "@/components/ui/table";

export interface ListViewRowProps {
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

export function ListViewRow({
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
}: ListViewRowProps) {
  const isFolder = item.type === DocumentItemType.FOLDER;
  const isSelected = selection
    ? selection.selectedIds.has(item.id)
    : item.id === selectedItemId;
  const selectionBlocked = selection?.getDisabledReason?.(item);
  const selectionDisabled =
    !!selection && (selection.disabled || (!isSelected && !!selectionBlocked));
  const isMenuOpen = activeMenuId === item.id;
  const {
    attributes,
    listeners,
    setDraggableRef,
    setActivatorNodeRef,
    transform,
    isDragging,
    setDroppableRef,
    isOver,
    dropBlocked,
    moveBlocked,
    dragCount,
  } = useDocumentItemDragAndDrop(item, selection);

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
    <TableRow
      onPointerDown={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest(
            'button,input,a,[role="checkbox"],[role="menuitem"]',
          )
        )
          return;
        listeners?.onPointerDown?.(event);
      }}
      unstyled
      title={dropBlocked ?? selectionBlocked}
      ref={setCombinedRef}
      style={style}
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
      className={cn(
        "relative focus-within:z-20 hover:bg-background cursor-pointer select-none transition-colors border-b border-border",
        isSelected && "z-10 bg-info-soft/40",
        ((!!selectionBlocked && !isSelected) || (isFolder && dropBlocked)) &&
          "opacity-40",
        isOver &&
          "z-20 bg-info-soft/50 border-y-2 border-dashed border-info-outline",
      )}
    >
      <TableCell unstyled className="p-4 flex items-center gap-3 min-w-0">
        {isDragging && dragCount > 1 ? (
          <span className="pointer-events-none absolute right-3 top-3 rounded-control bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
            {dragCount} items
          </span>
        ) : null}
        <Button
          type="button"
          variant="unstyled"
          ref={setActivatorNodeRef}
          disabled={selection ? selectionDisabled : !!moveBlocked}
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
            iconSize={18}
            className="p-2 rounded-panel"
          />
        </Button>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Button
            variant="unstyled"
            type="button"
            className="relative min-w-0 max-w-xs truncate rounded-xs text-left font-semibold text-foreground focus-visible:z-10"
            disabled={selectionDisabled}
            onPointerDown={(event) => {
              event.stopPropagation();
              listeners?.onPointerDown?.(event);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (selection) selection.onToggle(item);
              else if (isFolder) onFolderClick(item);
              else onPreview?.(item);
            }}
          >
            {item.name}
          </Button>
          {item.projectId ? (
            <DocumentProjectBadge projectId={item.projectId} />
          ) : null}
        </div>
        {!isProjectDocuments && !item.projectId && item.isStarred ? (
          <Star className="h-3.5 w-3.5 fill-warning-content text-warning-content shrink-0 ml-1" />
        ) : null}
      </TableCell>
      <TableCell unstyled className="p-4 hidden sm:table-cell">
        <DocumentsStatusBadge type="itemType" itemType={item.type} />
      </TableCell>
      <TableCell
        unstyled
        className="p-4 text-muted-foreground font-semibold hidden md:table-cell"
      >
        {formatDateShort(item.updatedAt)}
      </TableCell>
      <TableCell
        unstyled
        className="p-4 text-muted-foreground font-semibold hidden lg:table-cell"
      >
        {isFolder ? "—" : formatBytes(getDocumentDisplaySize(item))}
      </TableCell>
      <TableCell unstyled className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {selection ? (
            <Checkbox
              aria-label={`Select ${item.name}`}
              checked={isSelected}
              disabled={selectionDisabled}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={() => selection.onToggle(item)}
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
      </TableCell>
    </TableRow>
  );
}

export default React.memo(ListViewRow);
