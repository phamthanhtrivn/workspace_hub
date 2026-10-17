import { DocumentTypeDescription } from "./documents.enums";

// ─── Pagination ────────────────────────────────────────────────────────────────

export const ITEMS_PER_PAGE = 12;

// ─── MIME type constants ───────────────────────────────────────────────────────

export const DEFAULT_MIME_TYPE = "application/octet-stream";

export const MIME_TYPES = {
  // PDF
  PDF: "application/pdf",

  // Microsoft Word
  WORD_LEGACY: "application/msword",
  WORD_MODERN:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Microsoft Excel
  EXCEL_LEGACY: "application/vnd.ms-excel",
  EXCEL_MODERN:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Microsoft PowerPoint
  POWERPOINT_LEGACY: "application/vnd.ms-powerpoint",
  POWERPOINT_MODERN:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Archives
  ZIP: "application/zip",
  RAR: "application/x-rar-compressed",
  SEVENZIP: "application/x-7z-compressed",

  // Code / structured text
  JAVASCRIPT: "application/javascript",
  JSON: "application/json",
  XML: "application/xml",
  HTML: "text/html",
  CSS: "text/css",

  // Audio
  AUDIO_MPEG: "audio/mpeg",
  AUDIO_MP3: "audio/mp3",

  // Video
  VIDEO_MP4: "video/mp4",

  // Plain text
  TEXT_PLAIN: "text/plain",

  // MIME prefixes (used with startsWith)
  IMAGE_PREFIX: "image/",
  VIDEO_PREFIX: "video/",
  AUDIO_PREFIX: "audio/",
  TEXT_PREFIX: "text/",
} as const;

// ─── MIME → DocumentTypeDescription mapping ───────────────────────────────────

export const MIME_TO_TYPE: Record<string, DocumentTypeDescription> = {
  [MIME_TYPES.PDF]: DocumentTypeDescription.PDF,
  [MIME_TYPES.WORD_LEGACY]: DocumentTypeDescription.WORD,
  [MIME_TYPES.WORD_MODERN]: DocumentTypeDescription.WORD,
  [MIME_TYPES.EXCEL_LEGACY]: DocumentTypeDescription.EXCEL,
  [MIME_TYPES.EXCEL_MODERN]: DocumentTypeDescription.EXCEL,
  [MIME_TYPES.POWERPOINT_LEGACY]: DocumentTypeDescription.POWERPOINT,
  [MIME_TYPES.POWERPOINT_MODERN]: DocumentTypeDescription.POWERPOINT,
  [MIME_TYPES.TEXT_PLAIN]: DocumentTypeDescription.TEXT,
  [MIME_TYPES.ZIP]: DocumentTypeDescription.ZIP,
  [MIME_TYPES.RAR]: DocumentTypeDescription.RAR,
  [MIME_TYPES.SEVENZIP]: DocumentTypeDescription.SEVENZIP,
  [MIME_TYPES.AUDIO_MPEG]: DocumentTypeDescription.AUDIO_MP3,
  [MIME_TYPES.AUDIO_MP3]: DocumentTypeDescription.AUDIO_MP3,
  [MIME_TYPES.VIDEO_MP4]: DocumentTypeDescription.VIDEO_MP4,
};

// ─── File extension lists ──────────────────────────────────────────────────────

export const FILE_EXTENSIONS = {
  PDF: ["pdf"] as const,
  WORD: ["doc", "docx"] as const,
  EXCEL: ["xls", "xlsx"] as const,
  POWERPOINT: ["ppt", "pptx"] as const,
  ARCHIVE: ["zip", "rar", "7z", "tar", "gz"] as const,
  CODE: [
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "css",
    "json",
    "py",
    "java",
    "cpp",
    "c",
    "cs",
    "go",
    "rs",
    "php",
    "sh",
    "yaml",
    "yml",
    "xml",
    "sql",
    "env",
    "gitignore",
    "dockerfile",
    "npmrc",
    "editorconfig",
  ] as const,
  IMAGE: ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"] as const,
  VIDEO: ["mp4", "webm", "ogg", "mov", "avi", "mkv"] as const,
  AUDIO: ["mp3", "wav", "ogg", "m4a", "flac", "aac"] as const,
  TEXT: ["txt", "log", "md", "csv"] as const,
  OFFICE: ["doc", "docx", "xls", "xlsx", "ppt", "pptx"] as const,
  TEXT_PREVIEW: [
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
    "env",
    "gitignore",
    "dockerfile",
    "npmrc",
    "editorconfig",
  ] as const,
} as const;

// ─── Extension → DocumentTypeDescription mapping ─────────────────────────────

export const EXTENSION_TO_TYPE: Record<string, DocumentTypeDescription> = {
  // PDF
  ...Object.fromEntries(
    FILE_EXTENSIONS.PDF.map((e) => [e, DocumentTypeDescription.PDF]),
  ),
  // Word
  ...Object.fromEntries(
    FILE_EXTENSIONS.WORD.map((e) => [e, DocumentTypeDescription.WORD]),
  ),
  // Excel
  ...Object.fromEntries(
    FILE_EXTENSIONS.EXCEL.map((e) => [e, DocumentTypeDescription.EXCEL]),
  ),
  // PowerPoint
  ...Object.fromEntries(
    FILE_EXTENSIONS.POWERPOINT.map((e) => [
      e,
      DocumentTypeDescription.POWERPOINT,
    ]),
  ),
  // Archive
  zip: DocumentTypeDescription.ZIP,
  rar: DocumentTypeDescription.RAR,
  "7z": DocumentTypeDescription.SEVENZIP,
  // Audio
  mp3: DocumentTypeDescription.AUDIO_MP3,
  // Video
  mp4: DocumentTypeDescription.VIDEO_MP4,
  // Text (plain + config files)
  txt: DocumentTypeDescription.TEXT,
  env: DocumentTypeDescription.TEXT,
  gitignore: DocumentTypeDescription.TEXT,
  dockerfile: DocumentTypeDescription.TEXT,
  npmrc: DocumentTypeDescription.TEXT,
  editorconfig: DocumentTypeDescription.TEXT,
};

// ─── Icon color tokens per document category ──────────────────────────────────

export const ICON_COLORS = {
  FOLDER: {
    colorClass: "text-warning",
    bgClass: "bg-warning-soft",
    bgSelectedClass: "bg-warning-soft text-warning",
  },
  PDF: {
    colorClass: "text-destructive",
    bgClass: "bg-destructive-soft",
    bgSelectedClass: "bg-destructive-soft text-destructive",
  },
  WORD: {
    colorClass: "text-info",
    bgClass: "bg-info-soft",
    bgSelectedClass: "bg-info-soft text-info",
  },
  EXCEL: {
    colorClass: "text-success",
    bgClass: "bg-success-soft",
    bgSelectedClass: "bg-success-soft text-success",
  },
  POWERPOINT: {
    colorClass: "text-warning",
    bgClass: "bg-warning-soft",
    bgSelectedClass: "bg-warning-soft text-warning",
  },
  ARCHIVE: {
    colorClass: "text-warning",
    bgClass: "bg-warning-soft",
    bgSelectedClass: "bg-warning-soft text-warning",
  },
  CODE: {
    colorClass: "text-info",
    bgClass: "bg-info-soft",
    bgSelectedClass: "bg-info-soft text-info",
  },
  IMAGE: {
    colorClass: "text-info",
    bgClass: "bg-info-soft",
    bgSelectedClass: "bg-info-soft text-info",
  },
  VIDEO: {
    colorClass: "text-info",
    bgClass: "bg-info-soft",
    bgSelectedClass: "bg-info-soft text-info",
  },
  AUDIO: {
    colorClass: "text-info",
    bgClass: "bg-info-soft",
    bgSelectedClass: "bg-info-soft text-info",
  },
  TEXT: {
    colorClass: "text-muted-foreground",
    bgClass: "bg-background",
    bgSelectedClass: "bg-muted text-foreground",
  },
  DEFAULT: {
    colorClass: "text-muted-foreground",
    bgClass: "bg-background",
    bgSelectedClass: "bg-muted text-muted-foreground",
  },
} as const;

// ─── Document icon size ────────────────────────────────────────────────────────

export const DOCUMENT_ICON_DEFAULT_SIZE = 18;

// ─── Preview limits ────────────────────────────────────────────────────────────

export const MAX_TEXT_PREVIEW_SIZE = 102400;

// ─── Office viewer ─────────────────────────────────────────────────────────────

export const OFFICE_VIEWER_BASE_URL =
  "https://view.officeapps.live.com/op/embed.aspx";

// ─── Permission role labels ────────────────────────────────────────────────────

export const PERMISSION_ROLE_SHARE: Record<string, string> = {
  VIEWER: "Viewer",
  EDITOR: "Editor",
};

export const PERMISSION_ROLE_LABELS: Record<string, string> = {
  VIEWER: "Viewer",
  EDITOR: "Editor",
  OWNER: "Owner",
};

// ─── Version ───────────────────────────────────────────────────────────────────

export const ORIGINAL_VERSION_ID = "original";

// ─── User ─────────────────────────────────────────────────────────────────────

export const USER_FALLBACK_NAME = "Anonymous User";

// ─── Link access labels ────────────────────────────────────────────────────────

export const LINK_ACCESS_LABEL_IDS: Record<string, string> = {
  NONE: "documents.linkAccess.restricted",
  VIEWER: "documents.linkAccess.viewer",
  EDITOR: "documents.linkAccess.editor",
};

export const LINK_ACCESS_DESCRIPTION_IDS: Record<string, string> = {
  NONE: "documents.linkAccess.restrictedDescription",
  VIEWER: "documents.linkAccess.viewerDescription",
  EDITOR: "documents.linkAccess.editorDescription",
};

// ─── Drag & Drop ───────────────────────────────────────────────────────────────

export const DND_ROOT_ID = "root";

// ─── Query Parameters ─────────────────────────────────────────────────────────

export const DOCUMENT_QUERY_PARAMS = {
  VIEW: "view",
  FOLDER_ID: "folderId",
} as const;
