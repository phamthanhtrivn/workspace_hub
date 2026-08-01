import { DocumentTypeDescription } from "./documents.enums";

export const ITEMS_PER_PAGE = 8;
export const DEFAULT_MIME_TYPE = "application/octet-stream";

export const EXTENSION_TO_TYPE: Record<string, DocumentTypeDescription> = {
  pdf: DocumentTypeDescription.PDF,
  doc: DocumentTypeDescription.WORD,
  docx: DocumentTypeDescription.WORD,
  xls: DocumentTypeDescription.EXCEL,
  xlsx: DocumentTypeDescription.EXCEL,
  ppt: DocumentTypeDescription.POWERPOINT,
  pptx: DocumentTypeDescription.POWERPOINT,
  txt: DocumentTypeDescription.TEXT,
  zip: DocumentTypeDescription.ZIP,
  rar: DocumentTypeDescription.RAR,
  "7z": DocumentTypeDescription.SEVENZIP,
  mp3: DocumentTypeDescription.AUDIO_MP3,
  mp4: DocumentTypeDescription.VIDEO_MP4,
};

export const MIME_TO_TYPE: Record<string, DocumentTypeDescription> = {
  "application/pdf": DocumentTypeDescription.PDF,
  "application/msword": DocumentTypeDescription.WORD,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    DocumentTypeDescription.WORD,
  "application/vnd.ms-excel": DocumentTypeDescription.EXCEL,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    DocumentTypeDescription.EXCEL,
  "application/vnd.ms-powerpoint": DocumentTypeDescription.POWERPOINT,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    DocumentTypeDescription.POWERPOINT,
  "text/plain": DocumentTypeDescription.TEXT,
  "application/zip": DocumentTypeDescription.ZIP,
  "application/x-rar-compressed": DocumentTypeDescription.RAR,
  "application/x-7z-compressed": DocumentTypeDescription.SEVENZIP,
  "audio/mpeg": DocumentTypeDescription.AUDIO_MP3,
  "audio/mp3": DocumentTypeDescription.AUDIO_MP3,
  "video/mp4": DocumentTypeDescription.VIDEO_MP4,
};

export const TEXT_EXTENSIONS = [
  "txt",
  "log",
  "md",
  "csv",
  "json",
  "js",
  "ts",
  "jsx",
  "tsx",
  "css",
  "html",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  "go",
  "rs",
  "php",
  "sh",
  "yaml",
  "yml",
  "ini",
  "xml",
  "sql",
];

export const OFFICE_EXTENSIONS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

export const MAX_TEXT_PREVIEW_SIZE = 102400;

export const OFFICE_VIEWER_BASE_URL =
  "https://view.officeapps.live.com/op/embed.aspx";
