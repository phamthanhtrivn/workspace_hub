"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
} from "../../types/documents.enums";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Edit3,
  Move,
  Star,
  Trash,
  Info,
  Eye,
  CornerUpLeft,
  Trash2,
  Download,
  History,
  Share2,
} from "lucide-react";

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
}: ItemActionsMenuProps) {
  const isOpen = activeMenuId === item.id;

  return (
    <div className="relative">
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
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(null);
            }}
          />
          <div className="absolute right-0 z-100 mt-1.5 w-48 rounded-2xl bg-white border border-slate-100 shadow-xl py-2 animate-in fade-in slide-in-from-top-1 duration-150 font-semibold text-slate-700">
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
                    <Eye size={15} />
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
                    <Download size={15} />
                    <span>Tải xuống</span>
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
                    <History size={15} />
                    <span>Quản lý phiên bản</span>
                  </button>
                )}

                {onShare && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      onShare();
                    }}
                    className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left text-blue-600 hover:text-blue-700"
                  >
                    <Share2 size={15} />
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
                  <Info size={15} />
                  <span>Chi tiết</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onRename();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <Edit3 size={15} />
                  <span>Đổi tên</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onMove();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <Move size={15} />
                  <span>Di chuyển</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onToggleStar();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <Star
                    size={15}
                    className={cn(
                      item.isStarred && "fill-amber-400 text-amber-400",
                    )}
                  />
                  <span>
                    {item.isStarred ? "Bỏ gắn dấu sao" : "Gắn dấu sao"}
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(true);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 transition-colors text-left border-t border-slate-50"
                >
                  <Trash2 size={15} />
                  <span>Xóa tạm thời</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onArchive(false);
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50/50 transition-colors text-left"
                >
                  <CornerUpLeft size={15} />
                  <span>Khôi phục</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    onDeletePermanently?.();
                  }}
                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 transition-colors text-left border-t border-slate-50"
                >
                  <Trash size={15} />
                  <span>Xóa vĩnh viễn</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(ItemActionsMenu);
