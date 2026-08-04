import {
  EXTENSION_TO_TYPE,
  MIME_TO_TYPE,
  TEXT_EXTENSIONS,
  OFFICE_EXTENSIONS,
} from "../types/documents.constants";
import {
  DocumentTypeDescription,
  PreviewFileType,
  DocumentRole,
} from "../types/documents.enums";
import {
  DocumentRoleMetadata,
  StorageQuotaStats,
} from "../types/documents.types";
import { Eye, Edit, ShieldCheck, LucideIcon } from "lucide-react";

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const formatDateShort = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateLong = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getFileTypeDescription = (
  mimeType: string | null,
  name: string,
): string => {
  if (mimeType) {
    const cleanMime = mimeType.toLowerCase().trim();
    if (MIME_TO_TYPE[cleanMime]) {
      return MIME_TO_TYPE[cleanMime];
    }

    if (cleanMime.startsWith("image/")) {
      const type = cleanMime.split("/")[1].toUpperCase();
      return `${DocumentTypeDescription.IMAGE_BASE} ${type}`;
    }
    if (cleanMime.startsWith("video/")) {
      const type = cleanMime.split("/")[1].toUpperCase();
      return `${DocumentTypeDescription.VIDEO_BASE} ${type}`;
    }
    if (cleanMime.startsWith("audio/")) {
      const type = cleanMime.split("/")[1].toUpperCase();
      return `${DocumentTypeDescription.AUDIO_BASE} ${type}`;
    }
  }

  const ext = name.split(".").pop()?.toLowerCase();
  if (ext && EXTENSION_TO_TYPE[ext]) {
    return EXTENSION_TO_TYPE[ext];
  }

  return ext
    ? `${DocumentTypeDescription.FILE_BASE} ${ext.toUpperCase()}`
    : DocumentTypeDescription.UNKNOWN_FILE;
};

export const getPreviewFileType = (
  mimeType: string | null,
  name: string,
): PreviewFileType => {
  let fileExt = "";
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex > 0) {
    fileExt = name.slice(dotIndex + 1).toLowerCase();
  } else if (dotIndex === 0) {
    fileExt = name.slice(1).toLowerCase();
  }

  if (
    (mimeType && mimeType.toLowerCase().startsWith("image/")) ||
    ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(fileExt)
  ) {
    return PreviewFileType.IMAGE;
  }

  if (
    (mimeType && mimeType.toLowerCase() === "application/pdf") ||
    fileExt === "pdf"
  ) {
    return PreviewFileType.PDF;
  }

  if (
    (mimeType && mimeType.toLowerCase().startsWith("video/")) ||
    ["mp4", "webm", "ogg", "mov"].includes(fileExt)
  ) {
    return PreviewFileType.VIDEO;
  }

  if (
    (mimeType && mimeType.toLowerCase().startsWith("audio/")) ||
    ["mp3", "wav", "ogg", "m4a", "flac"].includes(fileExt)
  ) {
    return PreviewFileType.AUDIO;
  }

  if (
    TEXT_EXTENSIONS.includes(fileExt) ||
    (mimeType && mimeType.toLowerCase().startsWith("text/"))
  ) {
    return PreviewFileType.TEXT;
  }

  if (OFFICE_EXTENSIONS.includes(fileExt)) {
    return PreviewFileType.OFFICE;
  }

  return PreviewFileType.UNKNOWN;
};

export const calculateQuotaStats = (
  usedBytes: number | string | bigint,
  maxBytes: number | string | bigint,
): StorageQuotaStats => {
  const used = Number(usedBytes);
  const max = Number(maxBytes);

  const usedMB = (used / 1024 / 1024).toFixed(1);
  const maxGB = (max / 1024 / 1024 / 1024).toFixed(0);

  const percentage =
    max > 0 ? Math.min(100, Math.max(0, (used / max) * 100)) : 0;

  return { usedMB, maxGB, percentage };
};

export const getDocumentRoleMetadata = (
  userRole: DocumentRole | "NONE",
): DocumentRoleMetadata => {
  let badgeText = "Người xem";
  let badgeColor = "text-blue-600 bg-blue-50 border-blue-100/50";
  let Icon = Eye;

  if (userRole === DocumentRole.OWNER) {
    badgeText = "Chủ sở hữu";
    badgeColor = "text-purple-600 bg-purple-50 border-purple-100/50";
    Icon = ShieldCheck;
  } else if (userRole === DocumentRole.EDITOR) {
    badgeText = "Quyền chỉnh sửa";
    badgeColor = "text-green-600 bg-green-50 border-green-100/50";
    Icon = Edit;
  }

  const showOpenInWorkspace =
    userRole === DocumentRole.OWNER ||
    userRole === DocumentRole.EDITOR ||
    userRole === DocumentRole.VIEWER;

  return { badgeText, badgeColor, Icon, showOpenInWorkspace };
};
