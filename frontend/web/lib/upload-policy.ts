export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_UPLOAD_MIME_TYPE = "application/octet-stream";
export const ATTACHMENT_SIZE_LIMIT_MESSAGE = "File size limit exceeded (max 10 MiB).";

const UPLOAD_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jpe: "image/jpeg",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp",
  txt: "text/plain", csv: "text/csv", json: "application/json", md: "text/markdown",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip", gz: "application/gzip", "7z": "application/x-7z-compressed", rar: "application/vnd.rar",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
};
const UPLOAD_MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg", "image/x-png": "image/png",
  "application/x-pdf": "application/pdf", "audio/x-wav": "audio/wav", "audio/mp3": "audio/mpeg",
  "application/x-zip-compressed": "application/zip",
};

/** Browser MIME may be absent, generic or include recorder codec parameters. */
export function getUploadMimeType(fileName: string, declaredType?: string | null): string {
  const mimeType = declaredType?.split(";", 1)[0].trim().toLowerCase() ?? "";
  if (mimeType && mimeType !== DEFAULT_UPLOAD_MIME_TYPE) {
    return Object.hasOwn(UPLOAD_MIME_ALIASES, mimeType) ? UPLOAD_MIME_ALIASES[mimeType] : mimeType;
  }
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase() : "";
  return Object.hasOwn(UPLOAD_MIME_BY_EXTENSION, extension) ? UPLOAD_MIME_BY_EXTENSION[extension] : DEFAULT_UPLOAD_MIME_TYPE;
}

export function assertAttachmentSize(file: Pick<File, "size">): void {
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(ATTACHMENT_SIZE_LIMIT_MESSAGE);
  }
}
