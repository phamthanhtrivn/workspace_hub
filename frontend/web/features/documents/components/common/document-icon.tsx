"use client";

import React from "react";
import { IconType } from "react-icons";
import {
  FaFolder,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileCode,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaFileAlt,
  FaFile,
} from "react-icons/fa";
import { DocumentItem } from "../../types/documents.types";
import { DocumentItemType } from "../../types/documents.enums";
import {
  DOCUMENT_ICON_DEFAULT_SIZE,
  FILE_EXTENSIONS,
  ICON_COLORS,
  MIME_TYPES,
} from "../../types/documents.constants";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface IconConfig {
  icon: IconType;
  colorClass: string;
  bgClass: string;
  bgSelectedClass: string;
}

// ─── Icon resolution logic ─────────────────────────────────────────────────────

export function getDocumentIconConfig(item: DocumentItem): IconConfig {
  const isFolder = item.type === DocumentItemType.FOLDER;

  if (isFolder) {
    return { icon: FaFolder, ...ICON_COLORS.FOLDER };
  }

  const name = item.name || "";
  const mimeType = item.mimeType || "";
  const cleanMime = mimeType.toLowerCase().trim();
  const fileExt = name.split(".").pop()?.toLowerCase() || "";

  // 1. PDF
  if (
    cleanMime === MIME_TYPES.PDF ||
    (FILE_EXTENSIONS.PDF as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFilePdf, ...ICON_COLORS.PDF };
  }

  // 2. Word
  if (
    cleanMime === MIME_TYPES.WORD_LEGACY ||
    cleanMime === MIME_TYPES.WORD_MODERN ||
    (FILE_EXTENSIONS.WORD as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileWord, ...ICON_COLORS.WORD };
  }

  // 3. Excel
  if (
    cleanMime === MIME_TYPES.EXCEL_LEGACY ||
    cleanMime === MIME_TYPES.EXCEL_MODERN ||
    (FILE_EXTENSIONS.EXCEL as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileExcel, ...ICON_COLORS.EXCEL };
  }

  // 4. PowerPoint
  if (
    cleanMime === MIME_TYPES.POWERPOINT_LEGACY ||
    cleanMime === MIME_TYPES.POWERPOINT_MODERN ||
    (FILE_EXTENSIONS.POWERPOINT as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFilePowerpoint, ...ICON_COLORS.POWERPOINT };
  }

  // 5. Archive (zip / rar / 7z / tar / gz)
  if (
    cleanMime === MIME_TYPES.ZIP ||
    cleanMime === MIME_TYPES.RAR ||
    cleanMime === MIME_TYPES.SEVENZIP ||
    (FILE_EXTENSIONS.ARCHIVE as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileArchive, ...ICON_COLORS.ARCHIVE };
  }

  // 6. Code / structured text
  if (
    cleanMime === MIME_TYPES.JAVASCRIPT ||
    cleanMime === MIME_TYPES.JSON ||
    cleanMime === MIME_TYPES.XML ||
    cleanMime === MIME_TYPES.HTML ||
    cleanMime === MIME_TYPES.CSS ||
    (FILE_EXTENSIONS.CODE as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileCode, ...ICON_COLORS.CODE };
  }

  // 7. Image
  if (
    cleanMime.startsWith(MIME_TYPES.IMAGE_PREFIX) ||
    (FILE_EXTENSIONS.IMAGE as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileImage, ...ICON_COLORS.IMAGE };
  }

  // 8. Video
  if (
    cleanMime.startsWith(MIME_TYPES.VIDEO_PREFIX) ||
    (FILE_EXTENSIONS.VIDEO as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileVideo, ...ICON_COLORS.VIDEO };
  }

  // 9. Audio
  if (
    cleanMime.startsWith(MIME_TYPES.AUDIO_PREFIX) ||
    (FILE_EXTENSIONS.AUDIO as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileAudio, ...ICON_COLORS.AUDIO };
  }

  // 10. Plain text / Markdown / CSV
  if (
    cleanMime.startsWith(MIME_TYPES.TEXT_PREFIX) ||
    (FILE_EXTENSIONS.TEXT as readonly string[]).includes(fileExt)
  ) {
    return { icon: FaFileAlt, ...ICON_COLORS.TEXT };
  }

  // Default fallback
  return { icon: FaFile, ...ICON_COLORS.DEFAULT };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export interface DocumentIconProps {
  item: DocumentItem;
  iconSize?: number;
  isSelected?: boolean;
  className?: string;
}

export function DocumentIcon({
  item,
  iconSize = DOCUMENT_ICON_DEFAULT_SIZE,
  isSelected = false,
  className,
}: DocumentIconProps) {
  const config = getDocumentIconConfig(item);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center transition-all duration-300",
        isSelected
          ? config.bgSelectedClass
          : `${config.bgClass} ${config.colorClass}`,
        className,
      )}
    >
      <Icon size={iconSize} />
    </div>
  );
}
