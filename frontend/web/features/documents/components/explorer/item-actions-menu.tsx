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
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl text-xs font-bold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[#0052CC] hover:bg-slate-50 transition cursor-pointer"
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaDownload className="h-3.5 w-3.5 text-emerald-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaDownload className="h-3.5 w-3.5 text-emerald-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaHistory className="h-3.5 w-3.5 text-indigo-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-blue-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaShareAlt className="h-3.5 w-3.5 text-blue-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-violet-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaPaperPlane className="h-3.5 w-3.5 text-violet-500" />
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
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <FaInfoCircle className="h-3.5 w-3.5 text-slate-400" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaEdit className="h-3.5 w-3.5 text-amber-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FaFolderOpen className="h-3.5 w-3.5 text-teal-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {item.isStarred ? (
                    <FaStar className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  ) : (
                    <FaRegStar className="h-3.5 w-3.5 text-amber-400" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50/50 transition cursor-pointer border-t border-slate-50 mt-1 pt-2"
                >
                  <FaTrashAlt className="h-3.5 w-3.5 text-red-500" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50/50 transition cursor-pointer border-t border-slate-50 mt-1 pt-2"
                >
                  <FaTrash className="h-3.5 w-3.5 text-rose-600" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-green-600 hover:bg-green-50/50 transition cursor-pointer"
                >
                  <FaUndo className="h-3.5 w-3.5 text-green-600" />
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
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50/50 transition cursor-pointer border-t border-slate-50 mt-1 pt-2"
                >
                  <FaTrash className="h-3.5 w-3.5 text-rose-600" />
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
