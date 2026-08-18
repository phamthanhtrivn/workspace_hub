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
  FOLDER = "Folder",
  FILE = "File",
}

export enum ResourceTypeName {
  FOLDER = "Folder",
  FILE = "File",
}

export enum StarActionLabel {
  REMOVE = "Unstar",
  ADD = "Star",
}

export enum ArchiveActionLabel {
  DELETE = "Delete",
  RESTORE = "Restore",
}

export enum DocumentTypeDescription {
  PDF = "PDF Document",
  WORD = "Word Document",
  EXCEL = "Excel Spreadsheet",
  POWERPOINT = "PowerPoint Presentation",
  TEXT = "Plain Text File (TXT)",
  ZIP = "ZIP Archive",
  RAR = "RAR Archive",
  SEVENZIP = "7z Archive",
  AUDIO_MP3 = "MP3 Audio File",
  VIDEO_MP4 = "MP4 Video File",
  IMAGE_BASE = "Image",
  VIDEO_BASE = "Video File",
  AUDIO_BASE = "Audio File",
  FILE_BASE = "File",
  UNKNOWN_FILE = "Document File",
}

export enum NavigationLabel {
  ROOT = "My Files",
  CURRENT_FOLDER = "Current Folder",
  STARRED = "Starred",
  SHARED = "Shared",
  TRASH = "Trash",
}

export enum PreviewFileType {
  IMAGE = "IMAGE",
  PDF = "PDF",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  TEXT = "TEXT",
  OFFICE = "OFFICE",
  UNKNOWN = "UNKNOWN",
}

export enum DocumentRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
  NONE = "NONE",
}

export enum DownloadStatus {
  QUEUED = "queued",
  DOWNLOADING = "downloading",
  DONE = "done",
  ERROR = "error",
}

export enum ShareTabType {
  CHANNEL = "channel",
  DM = "dm",
}
