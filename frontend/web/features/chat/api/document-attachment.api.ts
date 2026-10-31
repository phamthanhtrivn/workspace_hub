import { documentsApi } from "@/features/documents/api/documents.api";
import type { DocumentItem } from "@/features/documents/types/documents.types";
import { assertAttachmentSize, DEFAULT_UPLOAD_MIME_TYPE } from "@/lib/upload-policy";
import { getPresignedUrls, uploadToS3, type GetPresignedUrlsParams } from "./media.api";

export type AttachmentChatContext = Pick<GetPresignedUrlsParams, "chatId" | "chatType">;

export async function copyDocumentsToChat(
  documents: DocumentItem[],
  context: AttachmentChatContext,
  signal: AbortSignal,
) {
  const attachments = [];
  for (const document of documents) {
    signal.throwIfAborted();
    assertAttachmentSize({ size: document.sizeBytes });
    const downloadUrl = await documentsApi.getDownloadUrl(document.id);
    signal.throwIfAborted();
    const response = await fetch(downloadUrl, { signal });
    if (!response.ok) throw new Error("Could not download the selected document.");
    const blob = await response.blob();
    assertAttachmentSize(blob);
    if (blob.size !== document.sizeBytes) {
      throw new Error("The document changed. Select it again to attach the current version.");
    }
    const mimeType = document.mimeType || DEFAULT_UPLOAD_MIME_TYPE;
    const file = new File([blob], document.name, { type: mimeType });
    const [upload] = await getPresignedUrls({
      ...context,
      files: [{ fileName: file.name, mimeType, sizeBytes: file.size }],
    });
    signal.throwIfAborted();
    if (!upload || !(await uploadToS3(file, upload.presignedUrl, signal))) {
      signal.throwIfAborted();
      throw new Error("Could not upload the selected document to this conversation.");
    }
    signal.throwIfAborted();
    attachments.push({ name: file.name, mimeType, sizeBytes: file.size, s3Key: upload.s3Key });
  }
  return attachments;
}
