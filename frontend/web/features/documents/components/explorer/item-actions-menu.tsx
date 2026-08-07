"use client";

import React, { useEffect, useRef } from "react";
import { DocumentItem } from "../../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
  DocumentRole,
} from "../../types/documents.enums";
import { cn } from "@/lib/utils";
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
} from "react-icons/fa";

interface ItemActionsMenuProps {
  item: DocumentItem;
  activeView: DocumentViewType;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onRename: () => void;
  onMove: () => void;
  onToggleStar: () => void;
  onArchive: (archive: boolean) => void;
  onViewDetails?: () => void;
  onDeletePermanently?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onManageVersions?: () => void;
  onShare?: () => void;
  onDownloadFolder?: () => void;
}

function ItemActionsMenu({
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
}: ItemActionsMenuProps) {
  const isOpen = activeMenuId === item.id;
  const userRole = item.userRole ?? DocumentRole.OWNER;
  const isOwner = userRole === DocumentRole.OWNER;
  const isEditor = userRole === DocumentRole.EDITOR;

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
      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenuId(isOpen ? null : item.id);
        }}
        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
      >
        <MoreVertical size={16} />
      </button>

      {/* Floating Actions Menu */}
      {isOpen && (
        <div className="absolute right-0 z-120 mt-1.5 w-48 rounded-2xl bg-white border border-slate-100 shadow-xl py-2 animate-in fade-in slide-in-from-top-1 duration-150 font-semibold text-slate-700">
          {activeView !== DocumentViewType.TRASH ? (
            <>
              {item.type !== DocumentItemType.FOLDER && onPreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onPreview();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left text-[var(--color-primary)] font-bold"
                >
                  <FaEye
                    className="text-[var(--color-primary)] shrink-0"
                    size={14}
                  />
                  <span>Xem trước</span>
                </button>
              )}

              {item.type !== DocumentItemType.FOLDER && onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDownload();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <FaDownload className="text-emerald-500 shrink-0" size={14} />
                  <span>Tải xuống</span>
                </button>
              )}

              {item.type === DocumentItemType.FOLDER && onDownloadFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDownloadFolder();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <FaDownload className="text-emerald-500 shrink-0" size={14} />
                  <span>Tải xuống (ZIP)</span>
                </button>
              )}

              {item.type !== DocumentItemType.FOLDER && onManageVersions && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onManageVersions();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <FaHistory className="text-indigo-500 shrink-0" size={14} />
                  <span>Quản lý phiên bản</span>
                </button>
              )}

              {(isOwner || isEditor) && onShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onShare();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left text-blue-600 hover:text-blue-700"
                >
                  <FaShareAlt className="text-blue-500 shrink-0" size={14} />
                  <span>Chia sẻ</span>
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                  onViewDetails?.();
                }}
                className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
              >
                <FaInfoCircle className="text-slate-500 shrink-0" size={14} />
                <span>Chi tiết</span>
              </button>

              {(isOwner || isEditor) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onRename();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <FaEdit className="text-amber-500 shrink-0" size={14} />
                  <span>Đổi tên</span>
                </button>
              )}

              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onMove();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <FaFolderOpen className="text-teal-500 shrink-0" size={14} />
                  <span>Di chuyển</span>
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                  onToggleStar();
                }}
                className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
              >
                {item.isStarred ? (
                  <FaStar
                    className="text-amber-400 fill-amber-400 shrink-0"
                    size={14}
                  />
                ) : (
                  <FaRegStar className="text-amber-400 shrink-0" size={14} />
                )}
                <span>{item.isStarred ? "Bỏ gắn dấu sao" : "Gắn dấu sao"}</span>
              </button>

              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(true);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 transition-colors text-left border-t border-slate-50"
                >
                  <FaTrashAlt className="text-red-500 shrink-0" size={14} />
                  <span>Xóa tạm thời</span>
                </button>
              )}
            </>
          ) : (
            <>
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(false);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50/50 transition-colors text-left"
                >
                  <FaUndo className="text-green-600 shrink-0" size={13} />
                  <span>Khôi phục</span>
                </button>
              )}

              {isOwner && onDeletePermanently && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDeletePermanently();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 transition-colors text-left border-t border-slate-50"
                >
                  <FaTrash className="text-rose-600 shrink-0" size={14} />
                  <span>Xóa vĩnh viễn</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(ItemActionsMenu);
