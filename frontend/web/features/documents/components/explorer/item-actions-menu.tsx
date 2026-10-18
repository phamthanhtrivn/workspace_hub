"use client";

import React, { useRef } from "react";
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

import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


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
        <AnchoredMenu onClose={() => setActiveMenuId(null)} side="bottom" align="end" aria-label="Document actions" className="z-50 w-48 rounded-panel border border-border bg-card p-2 text-xs font-semibold text-foreground animate-in fade-in slide-in-from-top-1 duration-150 shadow-panel">
          {activeView !== DocumentViewType.TRASH ? (
            <>
              {!isFolder && onPreview ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onPreview();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-info-content hover:bg-background transition cursor-pointer"
                >
                  <FaEye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </DropdownMenuItem>
              ) : null}

              {!isFolder && onDownload ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDownload();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaDownload className="h-3.5 w-3.5 text-success-content" />
                  <span>Download</span>
                </DropdownMenuItem>
              ) : null}

              {isFolder && onDownloadFolder ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDownloadFolder();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaDownload className="h-3.5 w-3.5 text-success-content" />
                  <span>Download ZIP</span>
                </DropdownMenuItem>
              ) : null}

              {!isFolder && (isOwner || isEditor) && onManageVersions ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onManageVersions();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaHistory className="h-3.5 w-3.5 text-info-content" />
                  <span>Manage versions</span>
                </DropdownMenuItem>
              ) : null}

              {!isProjectDocuments && canEdit && onShare ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onShare();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-info-content hover:bg-background transition cursor-pointer"
                >
                  <FaShareAlt className="h-3.5 w-3.5 text-info-content" />
                  <span>Share</span>
                </DropdownMenuItem>
              ) : null}

              {((isProjectDocuments && userRole !== DocumentRole.NONE) || isOwner) && onShareToChat ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onShareToChat();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-info-content hover:bg-background transition cursor-pointer"
                >
                  <FaPaperPlane className="h-3.5 w-3.5 text-info-content" />
                  <span>Share to chat</span>
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuItem closeOnClick={false}

                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                  onViewDetails?.();
                }}
                className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
              >
                <FaInfoCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Details</span>
              </DropdownMenuItem>

              {canEdit ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onRename();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaEdit className="h-3.5 w-3.5 text-warning-content" />
                  <span>Rename</span>
                </DropdownMenuItem>
              ) : null}

              {canMove ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onMove();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  <FaFolderOpen className="h-3.5 w-3.5 text-success-content" />
                  <span>Move</span>
                </DropdownMenuItem>
              ) : null}

              {!isProjectDocuments && onToggleStar ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onToggleStar();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-foreground hover:bg-background transition cursor-pointer"
                >
                  {item.isStarred ? (
                    <FaStar className="h-3.5 w-3.5 text-warning-content fill-warning-content" />
                  ) : (
                    <FaRegStar className="h-3.5 w-3.5 text-warning-content" />
                  )}
                  <span>{item.isStarred ? "Unstar" : "Star"}</span>
                </DropdownMenuItem>
              ) : null}

              {!isProjectDocuments && isOwner ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-destructive-content hover:bg-destructive-soft/50 transition cursor-pointer border-t border-border mt-1 pt-2"
                >
                  <FaTrashAlt className="h-3.5 w-3.5 text-destructive-content" />
                  <span>Move to trash</span>
                </DropdownMenuItem>
              ) : null}

              {isProjectDocuments && canEdit && onDeletePermanently ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDeletePermanently();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-destructive-content hover:bg-destructive-soft/50 transition cursor-pointer border-t border-border mt-1 pt-2"
                >
                  <FaTrash className="h-3.5 w-3.5 text-destructive-content" />
                  <span>Delete permanently</span>
                </DropdownMenuItem>
              ) : null}
            </>
          ) : (
            <>
              {isOwner ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-success-content hover:bg-success-soft/50 transition cursor-pointer"
                >
                  <FaUndo className="h-3.5 w-3.5 text-success-content" />
                  <span>Restore</span>
                </DropdownMenuItem>
              ) : null}

              {isOwner && onDeletePermanently ? (
                <DropdownMenuItem closeOnClick={false}

                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDeletePermanently();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-destructive-content hover:bg-destructive-soft/50 transition cursor-pointer border-t border-border mt-1 pt-2"
                >
                  <FaTrash className="h-3.5 w-3.5 text-destructive-content" />
                  <span>Delete permanently</span>
                </DropdownMenuItem>
              ) : null}
            </>
          )}
        </AnchoredMenu>
      ) : null}
    </div>
  );
}

export default React.memo(ItemActionsMenu);
