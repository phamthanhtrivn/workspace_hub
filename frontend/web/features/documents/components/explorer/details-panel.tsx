"use client";

import React from "react";
import { DocumentItem } from "../../types/documents.types";
import { DocumentItemType } from "../../types/documents.enums";
import {
  formatBytes,
  formatDateLong,
  getDocumentDisplaySize,
  getFileTypeDescription,
} from "../../utils/documents.utils";
import {
  X,
  User,
  Calendar,
  Layers,
  Download,
  Edit3,
  Share2,
  History,
} from "lucide-react";
import { DocumentIcon } from "../common/document-icon";
import { DocumentsIconButton } from "../ui/documents-icon-button";
import { DocumentsStatusBadge } from "../ui/documents-status-badge";

interface DetailsPanelProps {
  item: DocumentItem | null;
  onClose: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onToggleStar?: () => void;
  onArchive?: (archive: boolean) => void;
  onShare?: () => void;
  onDownload?: () => void;
  onManageVersions?: () => void;
}

export function DetailsPanel({
  item,
  onClose,
  onRename,
  onShare,
  onDownload,
  onManageVersions,
}: DetailsPanelProps) {
  if (!item) return null;

  const isFolder = item.type === DocumentItemType.FOLDER || (item.type as any) === "FOLDER";

  return (
    <div className="w-80 shrink-0 border-l border-slate-100 bg-white p-6 text-slate-700 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-4 duration-300">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800">
            Details
          </h3>
          <DocumentsIconButton
            icon={X}
            label="Close"
            onClick={onClose}
            size="icon-sm"
          />
        </div>

        {/* Thumbnail / Large Icon */}
        <div className="my-6 flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-center shadow-xs">
          <DocumentIcon item={item} iconSize={40} className="p-4 rounded-2xl bg-white shadow-xs border border-slate-100" />
          <h4 className="mt-4 text-xs font-bold text-slate-800 max-w-[200px] truncate">
            {item.name}
          </h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {getFileTypeDescription(item.mimeType, item.name)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2 py-3 border-y border-slate-100">
          {onDownload ? (
            <DocumentsIconButton
              icon={Download}
              label={isFolder ? "ZIP" : "Download"}
              onClick={onDownload}
            />
          ) : null}
          {onShare ? (
            <DocumentsIconButton
              icon={Share2}
              label="Share"
              onClick={onShare}
            />
          ) : null}
          {onRename ? (
            <DocumentsIconButton
              icon={Edit3}
              label="Rename"
              onClick={onRename}
            />
          ) : null}
          {onManageVersions && !isFolder ? (
            <DocumentsIconButton
              icon={History}
              label="Versions"
              onClick={onManageVersions}
            />
          ) : null}
        </div>

        {/* Metadata Properties */}
        <div className="mt-6 space-y-4 text-xs">
          <h5 className="font-black text-slate-400 uppercase tracking-wider text-[10px]">
            Properties
          </h5>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400">Owner</p>
              <p className="font-bold text-slate-700 truncate">
                {item.ownerEmail || "Me"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400">Last Modified</p>
              <p className="font-bold text-slate-700">
                {formatDateLong(item.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400">Size</p>
              <p className="font-bold text-slate-700">
                {isFolder ? "—" : formatBytes(getDocumentDisplaySize(item))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Role Status */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-bold">Access Permission</span>
        <DocumentsStatusBadge type="role" role={item.userRole} />
      </div>
    </div>
  );
}

export default React.memo(DetailsPanel);
