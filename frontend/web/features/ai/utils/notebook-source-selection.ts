import type { DocumentItem } from "@/features/documents/types/documents.types";
import { validateUploadBatch } from "../upload";

export { NOTEBOOK_SOURCE_LIMIT } from "../upload";

export function validateDocumentSources(
  documents: DocumentItem[],
  sources: { size_bytes: number }[],
) {
  return validateUploadBatch(
    documents.map((document) => ({
      name: document.name,
      size: document.sizeBytes,
    })),
    sources,
  );
}

export function documentSourceReason(
  document: DocumentItem,
  sources: { size_bytes: number }[],
  selected: DocumentItem[],
) {
  try {
    validateDocumentSources(
      [
        ...selected.filter((candidate) => candidate.id !== document.id),
        document,
      ],
      sources,
    );

    return "";
  } catch (error) {
    return (error as Error).message;
  }
}
