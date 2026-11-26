import { MIME_TYPES } from "./documents.constants";

export const TEXT_PREVIEW_TRUNCATED_NOTICE =
  "\n\n... [Preview truncated. Download to read the full document] ...";

export const PREVIEW_MESSAGES = {
  unsupportedTitle: "Preview is not supported for this file",
  unsupportedDescription:
    "Download the file to open it in a compatible application.",
  officeLocalDescription:
    "Microsoft Office Viewer cannot access files on a local or private network. Download the file to open it in Word, Excel or PowerPoint.",
  errorTitle: "Could not load preview",
  errorDescription:
    "Try again, or download the file to open it on your device.",
  mediaErrorDescription:
    "The file could not be loaded, or its format is not supported by this browser. Try again or download it to open on your device.",
  officeHelp:
    "Word, Excel and PowerPoint previews use Microsoft Office Viewer. If the preview does not appear, download the file to open it on your device.",
  download: "Download file",
  retry: "Try again",
} as const;

export const OFFICE_MIME_TYPES: readonly string[] = [
  MIME_TYPES.WORD_LEGACY,
  MIME_TYPES.WORD_MODERN,
  MIME_TYPES.EXCEL_LEGACY,
  MIME_TYPES.EXCEL_MODERN,
  MIME_TYPES.POWERPOINT_LEGACY,
  MIME_TYPES.POWERPOINT_MODERN,
];

export const BROWSER_IMAGE_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  "image/webp",
  "image/bmp",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
