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
      "Tên thư mục của notebook đang được dùng cho một file trong Tài liệu. Hãy đổi tên file đó rồi thử lại.",
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
  throw new Error("Không tải được tài liệu.");
}

export function validateUploadBatch(
  files: FileInfo[],
  sources: StoredSource[],
): UploadBatch {
  if (!files.length || files.length + sources.length > 5)
    throw new Error(
      "Notebook tối đa 5 file. Hãy chọn ít file hơn hoặc bỏ bớt nguồn.",
    );
  for (const file of files) {
    if (
      file.name.length > 300 ||
      !/\.(pdf|docx|txt|md|png|jpe?g|webp)$/i.test(file.name)
    )
      throw new Error(
        `${file.name}: chỉ nhận PDF, DOCX, TXT, MD, PNG, JPEG hoặc WebP; tên tối đa 300 ký tự.`,
      );
    if (!Number.isSafeInteger(file.size) || file.size <= 0)
      throw new Error(`${file.name}: file rỗng hoặc kích thước không hợp lệ.`);
    if (file.size > 20 * 1024 * 1024)
      throw new Error(`${file.name}: vượt 20 MiB. Hãy tách file nhỏ hơn.`);
  }
  const bytes = files.reduce((sum, f) => sum + f.size, 0);
  if (
    bytes + sources.reduce((sum, s) => sum + Number(s.size_bytes), 0) >
    50 * 1024 * 1024
  )
    throw new Error(
      "Tổng dung lượng notebook vượt 50 MiB. Hãy giảm dung lượng hoặc bỏ bớt nguồn.",
    );
  return { count: files.length, bytes };
}

export function uploadError(cause: unknown): string {
  const response = (
    cause as { response?: { data?: { message?: unknown } } } | null
  )?.response;
  if (typeof response?.data?.message === "string") return response.data.message;
  return cause instanceof Error ? cause.message : "Không tải được tài liệu.";
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
      ? " File đã lưu vẫn nằm trong Tài liệu; dùng Chọn từ Tài liệu để thêm lại."
      : "";
    throw new Error(uploadError(cause) + saved);
  }
}
