"use client";

import { Download, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentVersion } from "../../types/documents.types";
import {
  VERSION_MENU_CLASSES,
  VERSION_MESSAGES,
} from "../../types/document-version.constants";
import { DocumentActionMenuItem } from "../explorer/document-action-menu-item";
import { cn } from "@/lib/utils";

interface VersionActionsMenuProps {
  version: DocumentVersion;
  versionCount: number;
  canDelete: boolean;
  busy?: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete?: () => void;
}

export function VersionActionsMenu({
  version,
  versionCount,
  canDelete,
  busy,
  onPreview,
  onDownload,
  onDelete,
}: VersionActionsMenuProps) {
  const blockedReason =
    versionCount <= 1
      ? VERSION_MESSAGES.deleteLast
      : version.isCurrent
        ? VERSION_MESSAGES.deleteCurrent
        : busy
          ? VERSION_MESSAGES.operationBusy
          : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label={`Actions for version ${version.versionNumber}`}
          size="icon-sm"
          showTooltip={false}
        >
          <MoreHorizontal size={16} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={VERSION_MENU_CLASSES.content}>
        <DropdownMenuItem
          onClick={onPreview}
          className={VERSION_MENU_CLASSES.item}
        >
          <Eye aria-hidden="true" className="size-4" />
          Preview version
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDownload}
          className={VERSION_MENU_CLASSES.item}
        >
          <Download aria-hidden="true" className="size-4" />
          Download version
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DocumentActionMenuItem
              blockedReason={blockedReason}
              onClick={onDelete}
              className={cn(
                VERSION_MENU_CLASSES.item,
                blockedReason
                  ? VERSION_MENU_CLASSES.blocked
                  : VERSION_MENU_CLASSES.destructive,
              )}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {VERSION_MESSAGES.deleteAction}
            </DocumentActionMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
