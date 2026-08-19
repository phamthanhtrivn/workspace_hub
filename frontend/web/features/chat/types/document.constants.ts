export const EXTENSIONS = {
  PDF: ["pdf"],
  WORD: ["doc", "docx", "txt", "rtf"],
  EXCEL: ["xls", "xlsx", "csv"],
  IMAGE: ["png", "jpg", "jpeg", "gif", "svg", "webp"],
  VIDEO: ["mp4", "mov", "avi", "mkv", "webm"],
  AUDIO: ["mp3", "wav", "ogg", "m4a"],
  ARCHIVE: ["zip", "rar", "7z", "tar", "gz"],
  CODE: ["js", "ts", "jsx", "tsx", "html", "css", "json", "py", "java", "cpp"],
};

export const METADATA_QUERY_KEY = "chat-document-metadata";
export const METADATA_STALE_TIME = 10000;

export const CHAT_MESSAGE_TYPES = {
  DOCUMENT: "DOCUMENT",
  TEXT: "TEXT",
  NOTE: "NOTE",
  POLL: "POLL",
} as const;
