import React from "react";
import {
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Code,
  FileSpreadsheet,
  FileArchive,
  File,
} from "lucide-react";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { EXTENSIONS } from "../types/document.constants";

export function getFileIcon(
  type: DocumentItemType,
  mimeType: string | null,
  name: string,
) {
  if (type === DocumentItemType.FOLDER) {
    return (
      <Folder
        className="text-warning-content shrink-0 animate-pulse-slow"
        size={24}
      />
    );
  }

  const ext = name.split(".").pop()?.toLowerCase() || "";

  if (EXTENSIONS.PDF.includes(ext)) {
    return <FileText className="text-destructive-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.WORD.includes(ext)) {
    return <FileText className="text-info-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.EXCEL.includes(ext)) {
    return <FileSpreadsheet className="text-success-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.IMAGE.includes(ext)) {
    return <Image className="text-info-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.VIDEO.includes(ext)) {
    return <Video className="text-info-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.AUDIO.includes(ext)) {
    return <Music className="text-success-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.ARCHIVE.includes(ext)) {
    return <FileArchive className="text-warning-content shrink-0" size={24} />;
  }
  if (EXTENSIONS.CODE.includes(ext)) {
    return <Code className="text-info-content shrink-0" size={24} />;
  }

  return <File className="text-muted-foreground shrink-0" size={24} />;
}
