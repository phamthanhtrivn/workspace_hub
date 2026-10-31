"use client";

import { Details, DetailsSummary } from "@/components/ui/details";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notebooksApi } from "../api/notebooks.api";
import type { Notebook, NotebookActionKey, NotebookActionRunner } from "../types";
import { Citations } from "./citations";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  notebook: Notebook;
  saving: boolean;
  run: NotebookActionRunner;
  pendingAction?: NotebookActionKey | null;
};
export function StudioPanel({ notebook, saving, pendingAction, run }: Props) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const ready =
    notebook.sources.length > 0 &&
    notebook.sources.every((source) => source.status === "READY");
  return (
    <section aria-label="Studio" className="h-full space-y-5 overflow-y-auto">
      <h2 className="font-semibold">Studio</h2>
      <div className="grid gap-2">
        <Button
          variant="outline"
          loading={saving && pendingAction === "OVERVIEW"}
          disabled={!ready || saving}
          onClick={() =>
            run(() => notebooksApi.artifact(notebook.id, "OVERVIEW"), "OVERVIEW")
          }
        >
          Tổng quan & câu hỏi gợi ý
        </Button>
        <Button
          variant="outline"
          loading={saving && pendingAction === "SUMMARY"}
          disabled={!ready || saving}
          onClick={() =>
            run(() => notebooksApi.artifact(notebook.id, "SUMMARY"), "SUMMARY")
          }
        >
          Tóm tắt toàn văn
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Tổng quan dùng đoạn trích. Tóm tắt toàn văn xử lý tất cả đoạn đã lập chỉ
        mục, lưu tiến độ và có thể lâu hơn chat.
      </p>
      {notebook.artifacts.map((artifact) => (
        <Details
          className="rounded-lg border p-3"
          key={artifact.id}
          open={artifact.status === "RUNNING" || artifact.status === "QUEUED"}
        >
          <DetailsSummary className="cursor-pointer text-sm font-medium">
            {["QUEUED", "RUNNING"].includes(artifact.status) && <Spinner size={14} className="mr-2 inline-block align-middle" />}
            {artifact.kind === "SUMMARY" ? "Tóm tắt toàn văn" : "Tổng quan"} ·{" "}
            {artifact.status === "COMPLETED"
              ? "Hoàn tất"
              : `${artifact.status} ${artifact.progress}%`}
          </DetailsSummary>
          {artifact.hidden ? (
            <p className="mt-3 text-xs">
              Nội dung đã ẩn vì nguồn không còn hợp lệ.
            </p>
          ) : (
            <>
              <Citations
                notebookId={notebook.id}
                items={artifact.citations}
                content={artifact.content || undefined}
              />
              {artifact.error && (
                <p className="mt-2 text-xs text-red-700">{artifact.error}</p>
              )}
              {["QUEUED", "RUNNING"].includes(artifact.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  loading={saving && pendingAction === `cancel:${artifact.id}`}
                  onClick={() => run(() => notebooksApi.cancel(artifact.id), `cancel:${artifact.id}`)}
                >
                  Hủy tác vụ
                </Button>
              )}
              {["FAILED", "CANCELLED"].includes(artifact.status) && (
                <Button
                  loading={saving && pendingAction === `summary:${artifact.id}`}
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() =>
                    run(() =>
                      notebooksApi.artifact(
                        notebook.id,
                        artifact.kind as "SUMMARY" | "OVERVIEW",
                        artifact.sources.length
                          ? artifact.sources.map((source) => source.id)
                          : undefined,
                      ),
                      `summary:${artifact.id}`,
                    )
                  }
                >
                  Tiếp tục phần chưa xong
                </Button>
              )}
            </>
          )}
        </Details>
      ))}
      <form
        className="space-y-2 border-t pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            await notebooksApi.note(notebook.id, {
              title: title.trim() || "Ghi chú",
              content,
            });
            setContent("");
            setTitle("");
          }, "create-note");
        }}
      >
        <h3 className="text-sm font-semibold">Ghi chú mới</h3>
        <Input
          aria-label="Tiêu đề ghi chú"
          placeholder="Tiêu đề"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          aria-label="Nội dung ghi chú"
          placeholder="Điều bạn muốn ghi nhớ…"
          maxLength={20000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <Button loading={saving && pendingAction === "create-note"} size="sm" disabled={saving || !content.trim()}>
          Lưu ghi chú
        </Button>
      </form>
      {notebook.notes.map((note) => (
        <Details key={note.id} className="rounded-lg border p-3">
          <DetailsSummary className="cursor-pointer break-words text-sm font-medium">
            {note.title}
          </DetailsSummary>
          {note.hidden ? (
            <p className="mt-2 text-xs">
              Ghi chú bị ẩn do nguồn không còn hợp lệ.
            </p>
          ) : (
            <NoteEditor
              key={`${note.id}-${note.content}`}
              note={note}
              notebookId={notebook.id}
              run={run}
              saving={saving}
              pendingAction={pendingAction}
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-red-700"
            loading={saving && pendingAction === `remove:${note.id}`}
            onClick={() =>
              run(() => notebooksApi.deleteNote(notebook.id, note.id), `remove:${note.id}`)
            }
          >
            Xóa ghi chú
          </Button>
        </Details>
      ))}
    </section>
  );
}

function NoteEditor({
  note,
  notebookId,
  run,
  saving,
  pendingAction,
}: {
  note: Notebook["notes"][number];
  notebookId: string;
  run: Props["run"];
  saving: boolean;
  pendingAction?: NotebookActionKey | null;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          notebooksApi.note(notebookId, { title, content, noteId: note.id }),
          `note:${note.id}`,
        );
      }}
    >
      <Input
        aria-label="Sửa tiêu đề ghi chú"
        maxLength={200}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        aria-label="Sửa nội dung ghi chú"
        maxLength={20000}
        rows={8}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <Citations notebookId={notebookId} items={note.citations} />
      <Button
        size="sm"
        variant="outline"
        loading={saving && pendingAction === `note:${note.id}`}
        disabled={saving || !content.trim() || !title.trim()}
      >
        Lưu thay đổi
      </Button>
    </form>
  );
}
