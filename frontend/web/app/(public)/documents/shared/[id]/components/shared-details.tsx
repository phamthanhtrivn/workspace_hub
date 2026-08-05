"use client";

import React from "react";
import { FileText, Globe, Download, ExternalLink, History, Edit3 } from "lucide-react";
import { DocumentItem } from "@/features/documents/types/documents.types";
import {
  LinkAccess,
  DocumentRole,
} from "@/features/documents/types/documents.enums";
import {
  formatBytes,
  getDocumentRoleMetadata,
} from "@/features/documents/utils/documents.utils";

interface SharedDetailsProps {
  item: DocumentItem;
  userRole: DocumentRole | "NONE";
  onDownload?: () => void;
  onViewVersions?: () => void;
  onRename?: () => void;
}

export function SharedDetails({
  item,
  userRole,
  onDownload,
  onViewVersions,
  onRename,
}: SharedDetailsProps) {
  const {
    badgeText: roleBadgeText,
    badgeColor: roleBadgeColor,
    Icon: RoleIcon,
    showOpenInWorkspace,
  } = getDocumentRoleMetadata(userRole);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl shrink-0">
          <FileText size={28} />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-black text-slate-800 truncate max-w-xs md:max-w-md leading-tight flex items-center gap-1.5">
            <span>{item.name}</span>
            {onRename && (
              <button
                onClick={onRename}
                title="Đổi tên tài liệu"
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <Edit3 size={14} />
              </button>
            )}
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-1.5 flex-wrap">
            <span>Dung lượng: {formatBytes(item.sizeBytes)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <span className="truncate">Chủ sở hữu: {item.ownerEmail}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />

            {/* General Link Access Badge */}
            <div className="flex items-center gap-1 text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5 font-black uppercase text-[9px] tracking-wide border border-slate-200/30">
              <Globe size={10} />
              <span>
                {userRole === DocumentRole.EDITOR
                  ? "Bất kỳ ai có liên kết (Sửa)"
                  : "Bất kỳ ai có liên kết (Xem)"}
              </span>
            </div>

            {/* Custom User Role Badge */}
            <div
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 font-black uppercase text-[9px] tracking-wide border ${roleBadgeColor}`}
            >
              <RoleIcon size={10} />
              <span>{roleBadgeText}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-50 pt-4 md:pt-0">
        {onViewVersions && (
          <button
            onClick={onViewVersions}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-3 text-xs font-black transition-all cursor-pointer w-full md:w-auto"
          >
            <History size={14} />
            <span>Lịch sử phiên bản</span>
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-xs font-black shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-98 w-full md:w-auto"
          >
            <Download size={14} />
            <span>Tải xuống tệp</span>
          </button>
        )}
      </div>
    </div>
  );
}
