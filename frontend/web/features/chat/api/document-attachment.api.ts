import { api } from "@/lib/axios";
import type { PickerDocument } from "@/features/documents/api/file-copy.api";
import type { GetPresignedUrlsParams } from "./media.api";
export type AttachmentChatContext = Pick<
  GetPresignedUrlsParams,
  "chatId" | "chatType"
>;
export interface CopiedChatAttachment {
  name: string;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
}
const DOCUMENT_IMPORT_ROUTE = "/api/medias/import-documents";
export async function copyDocumentsToChat(
  documents: Pick<PickerDocument, "id" | "versionId">[],
  context: AttachmentChatContext,
  signal: AbortSignal,
  operationId: string = crypto.randomUUID(),
): Promise<CopiedChatAttachment[]> {
  return (
    await api.post(
      DOCUMENT_IMPORT_ROUTE,
      {
        ...context,
        operationId,
        refs: documents.map((document) => ({
          documentId: document.id,
          versionId: document.versionId,
        })),
      },
      { signal, timeout: 180000 },
    )
  ).data.data;
}
