"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notebooksApi } from "../api/notebooks.api";
import type { Notebook } from "../types";
import { Citations } from "./citations";

type Props = {
  notebook: Notebook;
  saving: boolean;
  run: (action: () => Promise<unknown>) => void;
};
export function StudioPanel({ notebook, saving, run }: Props) {
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
          disabled={!ready || saving}
          onClick={() =>
            run(() => notebooksApi.artifact(notebook.id, "OVERVIEW"))
          }
        >
          Tổng quan & câu hỏi gợi ý
        </Button>
        <Button
          variant="outline"
          disabled={!ready || saving}
          onClick={() =>
            run(() => notebooksApi.artifact(notebook.id, "SUMMARY"))
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
        <details
          className="rounded-lg border p-3"
          key={artifact.id}
          open={artifact.status === "RUNNING" || artifact.status === "QUEUED"}
        >
          <summary className="cursor-pointer text-sm font-medium">
            {artifact.kind === "SUMMARY" ? "Tóm tắt toàn văn" : "Tổng quan"} ·{" "}
            {artifact.status === "COMPLETED"
              ? "Hoàn tất"
              : `${artifact.status} ${artifact.progress}%`}
          </summary>
          {artifact.hidden ? (
            <p className="mt-3 text-xs">
              Nội dung đã ẩn vì nguồn không còn hợp lệ.
            </p>
          ) : (
            <>
              {artifact.content && (
                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {artifact.content}
                </div>
              )}
              <Citations notebookId={notebook.id} items={artifact.citations} />
              {artifact.error && (
                <p className="mt-2 text-xs text-red-700">{artifact.error}</p>
              )}
              {["QUEUED", "RUNNING"].includes(artifact.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => run(() => notebooksApi.cancel(artifact.id))}
                >
                  Hủy tác vụ
                </Button>
              )}
              {["FAILED", "CANCELLED"].includes(artifact.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() =>
                    run(() =>
                      notebooksApi.artifact(
                        notebook.id,
                        artifact.kind as "SUMMARY" | "OVERVIEW",
                      ),
                    )
                  }
                >
                  Tiếp tục phần chưa xong
                </Button>
              )}
            </>
          )}
        </details>
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
          });
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
        <Button size="sm" disabled={saving || !content.trim()}>
          Lưu ghi chú
        </Button>
      </form>
      {notebook.notes.map((note) => (
        <details key={note.id} className="rounded-lg border p-3">
          <summary className="cursor-pointer break-words text-sm font-medium">
            {note.title}
          </summary>
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
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 text-red-700"
            onClick={() =>
              run(() => notebooksApi.deleteNote(notebook.id, note.id))
            }
          >
            Xóa ghi chú
          </Button>
        </details>
      ))}
    </section>
  );
}

function NoteEditor({
  note,
  notebookId,
  run,
  saving,
}: {
  note: Notebook["notes"][number];
  notebookId: string;
  run: Props["run"];
  saving: boolean;
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
        disabled={saving || !content.trim() || !title.trim()}
      >
        Lưu thay đổi
      </Button>
    </form>
  );
}
