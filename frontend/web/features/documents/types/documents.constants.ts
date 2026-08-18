import { DocumentTypeDescription } from "./documents.enums";

// ─── Pagination ────────────────────────────────────────────────────────────────

export const ITEMS_PER_PAGE = 8;

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
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50",
    bgSelectedClass: "bg-amber-100 text-amber-600",
  },
  PDF: {
    colorClass: "text-red-500",
    bgClass: "bg-red-50",
    bgSelectedClass: "bg-red-100 text-red-600",
  },
  WORD: {
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50",
    bgSelectedClass: "bg-blue-100 text-blue-600",
  },
  EXCEL: {
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    bgSelectedClass: "bg-emerald-100 text-emerald-700",
  },
  POWERPOINT: {
    colorClass: "text-orange-500",
    bgClass: "bg-orange-50",
    bgSelectedClass: "bg-orange-100 text-orange-600",
  },
  ARCHIVE: {
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
    bgSelectedClass: "bg-amber-100 text-amber-700",
  },
  CODE: {
    colorClass: "text-cyan-600",
    bgClass: "bg-cyan-50",
    bgSelectedClass: "bg-cyan-100 text-cyan-700",
  },
  IMAGE: {
    colorClass: "text-pink-500",
    bgClass: "bg-pink-50",
    bgSelectedClass: "bg-pink-100 text-pink-600",
  },
  VIDEO: {
    colorClass: "text-indigo-500",
    bgClass: "bg-indigo-50",
    bgSelectedClass: "bg-indigo-100 text-indigo-600",
  },
  AUDIO: {
    colorClass: "text-violet-500",
    bgClass: "bg-violet-50",
    bgSelectedClass: "bg-violet-100 text-violet-600",
  },
  TEXT: {
    colorClass: "text-slate-600",
    bgClass: "bg-slate-50",
    bgSelectedClass: "bg-slate-100 text-slate-700",
  },
  DEFAULT: {
    colorClass: "text-slate-500",
    bgClass: "bg-slate-50",
    bgSelectedClass: "bg-slate-100 text-slate-600",
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
  VIEWER: "Người xem",
  EDITOR: "Người chỉnh sửa",
};

export const PERMISSION_ROLE_LABELS: Record<string, string> = {
  VIEWER: "Người xem",
  EDITOR: "Người chỉnh sửa",
  OWNER: "Chủ sở hữu",
};

// ─── Version ───────────────────────────────────────────────────────────────────

export const ORIGINAL_VERSION_ID = "original";

// ─── User ─────────────────────────────────────────────────────────────────────

export const USER_FALLBACK_NAME = "Người dùng ẩn danh";

// ─── Link access labels ────────────────────────────────────────────────────────

export const LINK_ACCESS_LABELS: Record<string, string> = {
  NONE: "Hạn chế",
  VIEWER: "Bất kỳ ai có liên kết (Xem)",
  EDITOR: "Bất kỳ ai có liên kết (Sửa)",
};

export const LINK_ACCESS_DESCRIPTIONS: Record<string, string> = {
  NONE: "Chỉ những người được thêm ở trên mới có thể truy cập bằng liên kết này.",
  VIEWER: "Bất kỳ ai có liên kết này đều có thể xem và tải xuống tài nguyên.",
  EDITOR:
    "Bất kỳ ai có liên kết này đều có quyền chỉnh sửa, di chuyển và xóa tài nguyên.",
};

// ─── Drag & Drop ───────────────────────────────────────────────────────────────

export const DND_ROOT_ID = "root";

// ─── Query Parameters ─────────────────────────────────────────────────────────

export const DOCUMENT_QUERY_PARAMS = {
  VIEW: "view",
  FOLDER_ID: "folderId",
} as const;
