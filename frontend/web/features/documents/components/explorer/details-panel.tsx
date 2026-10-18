"use client";

import React from "react";
import { SheetPanel } from "@/components/ui/sheet";
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
    <SheetPanel open aria-label={`Document details: ${item.name}`} onClose={onClose} modalBelow={800} modalContainerSelector="[data-document-canvas]" className="absolute inset-0 z-40 flex h-full min-h-0 min-w-0 w-full shrink-0 flex-col overflow-hidden @min-[800px]/document-canvas:static @min-[800px]/document-canvas:w-80 border-l border-border bg-card text-foreground animate-in slide-in-from-right-4 duration-200">
      {/* Panel Header */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Details</h3>
          <DocumentsIconButton
            icon={X}
            label="Close"
            showTooltip={false}
            onClick={onClose}
            size="icon-sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {/* Thumbnail / Large Icon */}
        <div className="flex flex-col items-center justify-center rounded-dialog border border-border bg-background p-6 text-center">
          <DocumentIcon item={item} iconSize={40} className="p-4 rounded-panel bg-card border border-border" />
          <h4 className="mt-4 text-xs font-semibold text-foreground max-w-[200px] truncate">
            {item.name}
          </h4>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {getFileTypeDescription(item.mimeType, item.name)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-4 gap-2 border-y border-border py-3">
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
          <h5 className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">
            Properties
          </h5>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-panel bg-background text-muted-foreground border border-border">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">Owner</p>
              <p className="font-semibold text-foreground truncate">
                {item.ownerEmail || "Me"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-panel bg-background text-muted-foreground border border-border">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">Last Modified</p>
              <p className="font-semibold text-foreground">
                {formatDateLong(item.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-panel bg-background text-muted-foreground border border-border">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">Size</p>
              <p className="font-semibold text-foreground">
                {isFolder ? "—" : formatBytes(getDocumentDisplaySize(item))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Role Status */}
      <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4">
        <span className="text-xs text-muted-foreground font-semibold">Access Permission</span>
        <DocumentsStatusBadge type="role" role={item.userRole} />
      </div>
    </SheetPanel>
  );
}

export default React.memo(DetailsPanel);
