import { EXTENSION_TO_TYPE, MIME_TO_TYPE } from "../types/documents.constants";
import { DocumentTypeDescription } from "../types/documents.enums";

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
