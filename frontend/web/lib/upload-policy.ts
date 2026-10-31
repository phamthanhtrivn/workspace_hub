export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_UPLOAD_MIME_TYPE = "application/octet-stream";
export const ATTACHMENT_SIZE_LIMIT_MESSAGE = "File size limit exceeded (max 10 MiB).";

export function assertAttachmentSize(file: Pick<File, "size">): void {
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(ATTACHMENT_SIZE_LIMIT_MESSAGE);
  }
}
