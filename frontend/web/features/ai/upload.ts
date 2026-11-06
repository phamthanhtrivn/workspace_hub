import { aiErrorMessage } from "@/lib/ai-feedback";

type FileInfo = { name: string; size: number };
type StoredSource = { size_bytes: number };
export type UploadBatch = { count: number; bytes: number };
export type UploadStage = "CHECKING" | "UPLOADING" | "ADDING";

type FolderConflict = {
  exists: boolean;
  item: { id: string; type: string } | null;
};

export async function notebookUploadFolder(
  notebookId: string,
  documents: {
    getNameConflict: (params: { name: string }) => Promise<FolderConflict>;
    createFolder: (params: { name: string }) => Promise<{ id: string }>;
  },
): Promise<string> {
  const name = `Notebook AI - ${notebookId}`;
  const existing = await documents.getNameConflict({ name });
  if (existing.exists) return folderId(existing);
  try {
    return (await documents.createFolder({ name })).id;
  } catch (cause) {
    if ((cause as { response?: { status?: number } })?.response?.status !== 409)
      throw cause;
    // Another tab may have created this notebook's folder meanwhile.
    const created = await documents.getNameConflict({ name });
    if (!created.exists) throw cause;
    return folderId(created);
  }
}

function folderId(conflict: FolderConflict): string {
  if (conflict.item?.type !== "FOLDER")
    throw new Error(
      "A file in Documents already uses this notebook folder name. Rename that file, then try again.",
    );
  return conflict.item.id;
}

export async function uploadWithUniqueName<T>(
  name: string,
  upload: (name: string) => Promise<T>,
): Promise<T> {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await upload(candidate);
    } catch (cause) {
      const response = (
        cause as {
          response?: { status?: number; data?: { code?: string } };
        }
      )?.response;
      if (
        response?.status !== 409 ||
        response.data?.code !== "DOCUMENT_NAME_CONFLICT" ||
        attempt === 2
      )
        throw cause;
      const suffix = ` (${crypto.randomUUID()})`;
      candidate =
        stem.slice(0, 300 - suffix.length - extension.length) +
        suffix +
        extension;
    }
  }
  throw new Error("Unable to upload this document.");
}

export function validateUploadBatch(
  files: FileInfo[],
  sources: StoredSource[],
): UploadBatch {
  if (!files.length || files.length + sources.length > 5)
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
      throw new Error(`${file.name}: the file is empty or its size is invalid.`);
    if (file.size > 20 * 1024 * 1024)
      throw new Error(`${file.name}: exceeds 20 MiB. Split it into smaller files.`);
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
  return aiErrorMessage(cause, "Unable to add this document. Check its format, size and your access, then try again.");
}

export async function uploadNotebookFiles<T extends FileInfo>(
  files: T[],
  sources: StoredSource[],
  actions: {
    check: (file: T, batch: UploadBatch) => Promise<unknown>;
    upload: (file: T) => Promise<{ id: string }>;
    add: (ids: string[]) => Promise<unknown>;
    stage: (stage: UploadStage) => void;
  },
) {
  const batch = validateUploadBatch(files, sources);
  actions.stage("CHECKING");
  for (const file of files) {
    try {
      await actions.check(file, batch);
    } catch (cause) {
      throw new Error(`${file.name}: ${uploadError(cause)}`);
    }
  }
  // No persistent upload is allowed until every file in this selection passes.
  actions.stage("UPLOADING");
  const documents: { id: string }[] = [];
  try {
    for (const file of files) documents.push(await actions.upload(file));
    actions.stage("ADDING");
    await actions.add(documents.map((doc) => doc.id));
  } catch (cause) {
    const saved = documents.length
      ? "Uploaded files are still in Documents. Use Choose from Documents to add them again."
      : "";
    throw new Error([uploadError(cause), saved].filter(Boolean).join(" "));
  }
}
