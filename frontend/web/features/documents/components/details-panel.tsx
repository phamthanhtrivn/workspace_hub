"use client";

import React from "react";
import { DocumentItem } from "../types/documents.types";
import {
  DocumentItemType,
  ResourceTypeLabel,
  StarActionLabel,
  ArchiveActionLabel,
} from "../types/documents.enums";
import { formatBytes, formatDateLong, getFileTypeDescription } from "../utils/documents.utils";
import {
  X,
  Folder,
  FileText,
  User,
  Calendar,
  Layers,
  Sparkles,
  Bot,
  Star,
  Download,
  Trash2,
  CornerUpLeft,
  Move,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";

interface DetailsPanelProps {
  item: DocumentItem | null;
  onClose: () => void;
  onRename: () => void;
  onMove: () => void;
  onToggleStar: () => void;
  onArchive: (archive: boolean) => void;
}

export default function DetailsPanel({
  item,
  onClose,
  onRename,
  onMove,
  onToggleStar,
  onArchive,
}: DetailsPanelProps) {
  if (!item) return null;

  const isFolder = item.type === DocumentItemType.FOLDER;

  return (
    <div className="w-80 shrink-0 border-l border-slate-100 bg-white flex flex-col h-full animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
          Chi tiết tài nguyên
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body details */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Preview Frame */}
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-100/50">
          <div
            className={`p-5 rounded-2xl mb-3 shadow-xs ${
              isFolder
                ? "bg-amber-100/70 text-amber-500"
                : "bg-blue-100/70 text-blue-500"
            }`}
          >
            {isFolder ? <Folder size={44} /> : <FileText size={44} />}
          </div>
          <span className="font-bold text-sm text-slate-800 text-center break-all w-full line-clamp-2">
            {item.name}
          </span>
          <span className="text-xs text-slate-400 font-semibold mt-1 max-w-[200px]">
            {item.type === DocumentItemType.FOLDER
              ? ResourceTypeLabel.FOLDER
              : getFileTypeDescription(item.mimeType, item.name)}
          </span>
        </div>

        {/* AI Assistants Widget */}
        {!isFolder && (
          <div className="flex flex-col gap-2 rounded-2xl bg-blue-50/50 border border-blue-100/30 p-4">
            <div className="flex items-center gap-2 text-[var(--color-primary)] mb-1">
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">
                Trợ lý AI tích hợp
              </span>
            </div>

            <button
              onClick={() =>
                toast.info("AI đang đọc tài liệu để tóm tắt cho bạn...")
              }
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-white hover:bg-slate-50 text-[var(--color-primary)] border border-blue-200/50 px-3 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Bot size={14} />
              <span>Tóm tắt tài liệu với AI</span>
            </button>

            <button
              onClick={() =>
                toast.info(
                  "Đang khởi tạo chatbot hỏi đáp trên file tài liệu...",
                )
              }
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-white hover:bg-slate-50 text-[var(--color-primary)] border border-blue-200/50 px-3 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <FileText size={14} />
              <span>Hỏi đáp trên tài liệu</span>
            </button>
          </div>
        )}

        {/* Metadata Properties */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Thông tin thuộc tính
          </h4>

          <div className="flex items-center gap-3">
            <User size={16} className="text-slate-400" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">
                Chủ sở hữu
              </span>
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                {item.ownerEmail}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-slate-400" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">
                Ngày tải lên
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {formatDateLong(item.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Layers size={16} className="text-slate-400" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">
                Dung lượng
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {isFolder ? "--" : formatBytes(item.sizeBytes)}
              </span>
            </div>
          </div>

          {!isFolder && (
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-medium">
                  Định dạng file
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {getFileTypeDescription(item.mimeType, item.name)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action shortcuts footer */}
      <div className="border-t border-slate-100 p-5 bg-slate-50/50 flex flex-wrap gap-2">
        <button
          onClick={onToggleStar}
          className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Star
            size={14}
            className={item.isStarred ? "fill-amber-400 text-amber-400" : ""}
          />
          <span>
            {item.isStarred ? StarActionLabel.REMOVE : StarActionLabel.ADD}
          </span>
        </button>

        <button
          onClick={onRename}
          className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Edit3 size={14} />
          <span>Sửa</span>
        </button>

        <button
          onClick={onMove}
          className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Move size={14} />
          <span>Chuyển</span>
        </button>

        {!item.isArchived ? (
          <button
            onClick={() => onArchive(true)}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-3 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>{ArchiveActionLabel.DELETE}</span>
          </button>
        ) : (
          <button
            onClick={() => onArchive(false)}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-100 px-3 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <CornerUpLeft size={14} />
            <span>{ArchiveActionLabel.RESTORE}</span>
          </button>
        )}
      </div>
    </div>
  );
}
