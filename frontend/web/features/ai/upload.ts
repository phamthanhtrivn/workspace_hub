import { aiErrorMessage } from "@/lib/ai-feedback";

type FileInfo = { name: string; size: number };
export const NOTEBOOK_SOURCE_LIMIT = 5;
type StoredSource = { size_bytes: number };
export type UploadBatch = { count: number; bytes: number };
export type UploadStage = "UPLOADING" | "ADDING";

export function validateUploadBatch(
  files: FileInfo[],
  sources: StoredSource[],
): UploadBatch {
  if (!files.length || files.length + sources.length > NOTEBOOK_SOURCE_LIMIT)
    throw new Error(
      "A notebook can have up to 5 files. Select fewer files or remove a source.",
    );
  for (const file of files) {
    if (
      file.name.length > 300 ||
      !/\.(pdf|docx|txt|md|png|jpe?g|webp)$/i.test(file.name)
    )
      throw new Error(
        `${file.name}: use PDF, DOCX, TXT, MD, PNG, JPEG or WebP, with a name of up to 300 characters.`,
      );
    if (!Number.isSafeInteger(file.size) || file.size <= 0)
      throw new Error(
        `${file.name}: the file is empty or its size is invalid.`,
      );
    if (file.size > 20 * 1024 * 1024)
      throw new Error(
        `${file.name}: exceeds 20 MiB. Split it into smaller files.`,
      );
  }
  const bytes = files.reduce((sum, f) => sum + f.size, 0);
  if (
    bytes + sources.reduce((sum, s) => sum + Number(s.size_bytes), 0) >
    50 * 1024 * 1024
  )
    throw new Error(
      "This notebook exceeds 50 MiB. Choose smaller files or remove a source.",
    );

  return { count: files.length, bytes };
}

export function uploadError(cause: unknown): string {
  return aiErrorMessage(
    cause,
    "Unable to add this document. Check its format, size and your access, then try again.",
  );
}
