"use client";

import React, { useEffect, useRef } from "react";
import { DocumentItem } from "../../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
  DocumentRole,
} from "../../types/documents.enums";
import { DocumentsIconButton } from "../ui/documents-icon-button";
import { MoreVertical } from "lucide-react";
import {
  FaEye,
  FaDownload,
  FaHistory,
  FaShareAlt,
  FaInfoCircle,
  FaEdit,
  FaFolderOpen,
  FaStar,
  FaRegStar,
  FaTrashAlt,
  FaUndo,
  FaTrash,
  FaPaperPlane,
} from "react-icons/fa";

interface ItemActionsMenuProps {
  item: DocumentItem;
  activeView: DocumentViewType;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onRename: () => void;
  onMove: () => void;
  onToggleStar?: () => void;
  onArchive: (archive: boolean) => void;
  onViewDetails?: () => void;
  onDeletePermanently?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onManageVersions?: () => void;
  onShare?: () => void;
  onDownloadFolder?: () => void;
  onShareToChat?: () => void;
  isProjectDocuments?: boolean;
}

export function ItemActionsMenu({
  item,
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
  isProjectDocuments = false,
}: ItemActionsMenuProps) {
  const isOpen = activeMenuId === item.id;
  const userRole = item.userRole ?? DocumentRole.OWNER;
  const isOwner = userRole === DocumentRole.OWNER;
  const isEditor = userRole === DocumentRole.EDITOR;
  const canEdit = isOwner || isEditor;
  const canMove = isProjectDocuments ? canEdit : isOwner;
  const isFolder = item.type === DocumentItemType.FOLDER;

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setActiveMenuId]);

  return (
    <div className="relative" ref={menuRef}>
      <DocumentsIconButton
        icon={MoreVertical}
        label="Actions"
        showTooltip={false}
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenuId(isOpen ? null : item.id);
        }}
      />

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-panel border border-border bg-card p-2 text-xs font-semibold text-foreground animate-in fade-in slide-in-from-top-1 duration-150 shadow-panel">
          {activeView !== DocumentViewType.TRASH ? (
            <>
              {!isFolder && onPreview ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onPreview();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-info hover:bg-background transition cursor-pointer"
                >
                  <FaEye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </button>
              ) : null}

              {!isFolder && onDownload ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDownload();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaDownload className="h-3.5 w-3.5 text-success" />
                  <span>Download</span>
                </button>
              ) : null}

              {isFolder && onDownloadFolder ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDownloadFolder();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaDownload className="h-3.5 w-3.5 text-success" />
                  <span>Download ZIP</span>
                </button>
              ) : null}

              {!isFolder && (isOwner || isEditor) && onManageVersions ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onManageVersions();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaHistory className="h-3.5 w-3.5 text-info" />
                  <span>Manage versions</span>
                </button>
              ) : null}

              {!isProjectDocuments && canEdit && onShare ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onShare();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-info hover:bg-background transition cursor-pointer"
                >
                  <FaShareAlt className="h-3.5 w-3.5 text-info" />
                  <span>Share</span>
                </button>
              ) : null}

              {((isProjectDocuments && userRole !== DocumentRole.NONE) || isOwner) && onShareToChat ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onShareToChat();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-info hover:bg-background transition cursor-pointer"
                >
                  <FaPaperPlane className="h-3.5 w-3.5 text-info" />
                  <span>Share to chat</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                  onViewDetails?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
              >
                <FaInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Details</span>
              </button>

              {canEdit ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onRename();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaEdit className="h-3.5 w-3.5 text-warning" />
                  <span>Rename</span>
                </button>
              ) : null}

              {canMove ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onMove();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaFolderOpen className="h-3.5 w-3.5 text-success" />
                  <span>Move</span>
                </button>
              ) : null}

              {!isProjectDocuments && onToggleStar ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onToggleStar();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  {item.isStarred ? (
                    <FaStar className="h-3.5 w-3.5 text-warning fill-warning" />
                  ) : (
                    <FaRegStar className="h-3.5 w-3.5 text-warning" />
                  )}
                  <span>{item.isStarred ? "Unstar" : "Star"}</span>
                </button>
              ) : null}

              {!isProjectDocuments && isOwner ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-destructive hover:bg-destructive-soft/50 transition cursor-pointer border-t border-border mt-1 pt-2"
                >
                  <FaTrashAlt className="h-3.5 w-3.5 text-destructive" />
                  <span>Move to trash</span>
                </button>
              ) : null}

              {isProjectDocuments && canEdit && onDeletePermanently ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDeletePermanently();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-destructive hover:bg-destructive-soft/50 transition cursor-pointer border-t border-border mt-1 pt-2"
                >
                  <FaTrash className="h-3.5 w-3.5 text-destructive" />
                  <span>Delete permanently</span>
                </button>
              ) : null}
            </>
          ) : (
            <>
              {isOwner ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-success hover:bg-success-soft/50 transition cursor-pointer"
                >
                  <FaUndo className="h-3.5 w-3.5 text-success" />
                  <span>Restore</span>
                </button>
              ) : null}

              {isOwner && onDeletePermanently ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDeletePermanently();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-destructive hover:bg-destructive-soft/50 transition cursor-pointer border-t border-border mt-1 pt-2"
                >
                  <FaTrash className="h-3.5 w-3.5 text-destructive" />
                  <span>Delete permanently</span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(ItemActionsMenu);
