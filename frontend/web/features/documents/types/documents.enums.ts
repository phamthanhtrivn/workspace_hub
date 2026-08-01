export enum DocumentItemType {
  FILE = "FILE",
  FOLDER = "FOLDER",
}

export enum DocumentViewType {
  MY_FILES = "MY_FILES",
  SHARED = "SHARED",
  STARRED = "STARRED",
  TRASH = "TRASH",
}

export enum SharePermission {
  VIEWER = "VIEWER",
  EDITOR = "EDITOR",
}

export enum LinkAccess {
  NONE = "NONE",
  VIEWER = "VIEWER",
  EDITOR = "EDITOR",
}

export enum ViewLayout {
  GRID = "GRID",
  LIST = "LIST",
}

export enum DocumentSortBy {
  LATEST = "LATEST",
  OLDEST = "OLDEST",
}

export enum UploadState {
  IDLE = "IDLE",
  INITIATING = "INITIATING",
  UPLOADING = "UPLOADING",
  CONFIRMING = "CONFIRMING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum ResourceTypeLabel {
  FOLDER = "Thư mục hệ thống",
  FILE = "Tập tin tài liệu",
}

export enum ResourceTypeName {
  FOLDER = "Thư mục",
  FILE = "Tập tin",
}

export enum StarActionLabel {
  REMOVE = "Bỏ sao",
  ADD = "Sao",
}

export enum ArchiveActionLabel {
  DELETE = "Xóa tài nguyên",
  RESTORE = "Khôi phục tài nguyên",
}

export enum DocumentTypeDescription {
  PDF = "Tài liệu PDF",
  WORD = "Tài liệu Word",
  EXCEL = "Bảng tính Excel",
  POWERPOINT = "Bài thuyết trình PowerPoint",
  TEXT = "Tệp văn bản thuần (TXT)",
  ZIP = "Tệp nén ZIP",
  RAR = "Tệp nén RAR",
  SEVENZIP = "Tệp nén 7z",
  AUDIO_MP3 = "Tệp âm thanh MP3",
  VIDEO_MP4 = "Tệp video MP4",
  IMAGE_BASE = "Hình ảnh",
  VIDEO_BASE = "Tệp video",
  AUDIO_BASE = "Tệp âm thanh",
  FILE_BASE = "Tệp tin",
  UNKNOWN_FILE = "Tập tin tài liệu",
}

export enum NavigationLabel {
  ROOT = "Tài liệu của tui",
  CURRENT_FOLDER = "Thư mục hiện tại",
  STARRED = "Đã đánh dấu sao",
  SHARED = "Được chia sẻ",
}
