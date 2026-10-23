"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentsApi } from "@/features/documents/api/documents.api";
import { useAppSelector } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import type { Source } from "../types";
import { useSourceUpload } from "../hooks/use-source-upload";
import { uploadError } from "../upload";
import { LoadingState } from "@/components/ui/loading-state";
import { Spinner } from "@/components/ui/spinner";
import type { NotebookActionKey, NotebookActionRunner } from "../types";

const states: Record<string, string> = {
  QUEUED: "Chờ xử lý",
  INDEXING: "Đang đọc và tạo chỉ mục",
  READY: "Sẵn sàng",
  FAILED: "Xử lý lỗi",
  UNAVAILABLE: "Nguồn không còn hợp lệ",
};
type Props = {
  id: string;
  sources: Source[];
  selected: string[];
  toggle: (id: string) => void;
  busy: boolean;
  run: NotebookActionRunner;
  pendingAction?: NotebookActionKey | null;
  refresh: () => Promise<unknown>;
};

export function SourcePanel({
  id,
  sources,
  selected,
  toggle,
  busy,
  run,
  pendingAction,
  refresh,
}: Props) {
  const upload = useRef<HTMLInputElement>(null);
  const [picker, setPicker] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const { uploadFiles, uploading, stage, error } = useSourceUpload(
    id,
    sources,
    refresh,
  );
  const sourceBusy = busy || uploading || pickerBusy;
  return (
    <section className="flex h-full flex-col gap-4" aria-label="Nguồn tài liệu">
      <header className="flex items-center justify-between">
        <h2 className="font-semibold">Nguồn</h2>
        <span className="text-xs text-muted-foreground">
          {sources.length}/5 file
        </span>
      </header>
      <div className="grid gap-2">
        <Button loading={uploading}
          variant="outline"
          disabled={sourceBusy || sources.length >= 5}
          onClick={() => upload.current?.click()}
        >
          <Upload />
          {stage === "CHECKING"
            ? "Đang kiểm tra file…"
            : stage === "ADDING"
              ? "Đang thêm nguồn…"
              : uploading
                ? "Đang tải file…"
                : "Tải file"}
        </Button>
        <Button
          variant="outline"
          disabled={sourceBusy || sources.length >= 5}
          onClick={() => setPicker((value) => !value)}
        >
          {picker ? "Đóng danh sách" : "Chọn từ Tài liệu"}
        </Button>
      </div>
      <input
        hidden
        ref={upload}
        type="file"
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        multiple
        onChange={(event) => {
          void uploadFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Tối đa 5 nguồn, 20 MiB/file, 50 MiB/notebook, 40.000 token/file. Nhận
        PDF ≤100 trang, DOCX, TXT, MD và ảnh PNG/JPEG/WebP. Trang scan được OCR;
        tối đa 24 trang/hình cần AI đọc ảnh mỗi file. Nội dung hình được xử lý
        một lần khi thêm nguồn.
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      {picker && (
        <DocumentPicker
          notebookId={id}
          addedIds={sources.map((source) => source.document_id)}
          onAdded={refresh}
          disabled={busy || uploading}
          onPending={setPickerBusy}
        />
      )}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {!sources.length && (
          <p className="py-8 text-sm text-muted-foreground">
            Thêm nguồn đầu tiên để bắt đầu. Chỉ lập chỉ mục một lần, không đọc
            lại file mỗi câu hỏi.
          </p>
        )}
        {sources.map((source) => (
          <article key={source.id} className="rounded-lg border p-3">
            <label className="flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="mt-1 accent-blue-800"
                checked={selected.includes(source.id)}
                disabled={source.status !== "READY" || sourceBusy}
                onChange={() => toggle(source.id)}
              />
              <span className="min-w-0 break-words">{source.name}</span>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {states[source.status] || source.status}
              {source.status === "READY" ? ` · ${source.chunk_count} đoạn` : ""}
            </p>
            {source.status === "INDEXING" && (
              <p role="status" className="mt-1 flex items-center gap-2 text-xs">
                <Spinner size={14} />
                {source.progress < 40
                  ? "Đang đọc tài liệu và nhận diện chữ…"
                  : source.progress < 85
                    ? "Đang phân tích hình và lưu kết quả…"
                    : "Đang tạo chỉ mục tìm kiếm…"}
                {` ${source.progress}%`}
              </p>
            )}
            {source.error && (
              <p className="mt-2 break-words text-xs text-red-700">
                {source.error}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              {source.status === "FAILED" && (
                <Button
                  loading={pendingAction === `retry:${source.id}`}
                  size="sm"
                  variant="outline"
                  disabled={sourceBusy}
                  onClick={() =>
                    run(() => notebooksApi.source(id, source.id, "retry"), `retry:${source.id}`)
                  }
                >
                  Thử lại
                </Button>
              )}
              {source.status === "READY" && (
                <Button
                  loading={pendingAction === `retry:${source.id}`}
                  size="sm"
                  variant="ghost"
                  disabled={sourceBusy}
                  onClick={() =>
                    run(() => notebooksApi.source(id, source.id, "retry"), `retry:${source.id}`)
                  }
                >
                  Lập lại chỉ mục
                </Button>
              )}
              <Button
                loading={pendingAction === `remove:${source.id}`}
                size="sm"
                variant="ghost"
                disabled={sourceBusy}
                onClick={() =>
                  run(() => notebooksApi.source(id, source.id, "remove"), `remove:${source.id}`)
                }
              >
                <X />
                Bỏ nguồn
              </Button>
            </div>
          </article>
        ))}
      </div>
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Đang chọn {selected.length} nguồn sẵn sàng
      </p>
    </section>
  );
}

function DocumentPicker({
  notebookId,
  addedIds,
  onAdded,
  disabled,
  onPending,
}: {
  notebookId: string;
  addedIds: string[];
  onAdded: () => Promise<unknown>;
  disabled: boolean;
  onPending: (value: boolean) => void;
}) {
  const userId = useAppSelector((state) => state.auth.userId);
  const [shared, setShared] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const folderId = folders.at(-1);
  const query = useQuery({
    queryKey: [
      "notebook-document-picker",
      userId,
      shared,
      folderId,
      page,
      term,
    ],
    queryFn: () =>
      shared
        ? documentsApi.getSharedDocuments({ page, limit: 10, search: term })
        : documentsApi.getDocuments({
            folderId,
            page,
            limit: 10,
            search: term,
          }),
    retry: false,
    gcTime: 0,
  });
  const add = async (documentId: string) => {
    if (pending || disabled) return;
    setPending(true);
    setPendingDocumentId(documentId);
    onPending(true);
    setError("");
    try {
      await notebooksApi.add(notebookId, [documentId]);
      await onAdded();
    } catch (cause) {
      setError(uploadError(cause));
    } finally {
      setPending(false);
      setPendingDocumentId(null);
      onPending(false);
    }
  };
  return (
    <div className="space-y-2 rounded-lg border bg-slate-50 p-2">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={!shared ? "outline" : "ghost"}
          onClick={() => {
            setShared(false);
            setFolders([]);
            setPage(1);
          }}
        >
          Của tôi
        </Button>
        <Button
          size="sm"
          variant={shared ? "outline" : "ghost"}
          onClick={() => {
            setShared(true);
            setFolders([]);
            setPage(1);
          }}
        >
          Được chia sẻ
        </Button>
      </div>
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          setTerm(search);
          setPage(1);
        }}
      >
        <Input
          aria-label="Tìm tài liệu"
          placeholder="Tên file…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button size="sm" variant="outline">
          Tìm
        </Button>
      </form>
      {folders.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setFolders((value) => value.slice(0, -1));
            setPage(1);
          }}
        >
          Thư mục cha
        </Button>
      )}
      {query.isPending && (
        <LoadingState label="Đang tải…" className="text-xs" />
      )}
      {query.isError && (
        <p role="alert" className="text-xs text-red-700">
          Không tải được danh sách.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      {!query.isError &&
        query.data?.data.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-2 border-b py-2 text-xs"
          >
            <span className="min-w-0 break-words">{file.name}</span>
            {file.type === "FOLDER" ? (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Mở ${file.name}`}
                disabled={shared}
                onClick={() => {
                  setFolders((value) => [...value, file.id]);
                  setPage(1);
                }}
              >
                <Folder />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                loading={pending && pendingDocumentId === file.id}
                disabled={
                  pending ||
                  disabled ||
                  addedIds.includes(file.id) ||
                  addedIds.length >= 5
                }
                onClick={() => void add(file.id)}
              >
                {addedIds.includes(file.id) ? "Đã thêm" : "Thêm"}
              </Button>
            )}
          </div>
        ))}
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Trước
        </Button>
        <span className="text-xs">{page}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={!query.data?.meta || page >= query.data.meta.totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
