"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import { useNotebook, useNotebookChat } from "../hooks/use-notebook";
import { Citations } from "./citations";
import { SourcePanel } from "./source-panel";
import { StudioPanel } from "./studio-panel";

export function NotebookWorkspace({ id }: { id: string }) {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? (
    <Workspace key={`${userId}-${id}`} id={id} />
  ) : (
    <p className="p-8">Vui lòng đăng nhập.</p>
  );
}

function Workspace({ id }: { id: string }) {
  const query = useNotebook(id);
  const chat = useNotebookChat(id, query.refresh);
  const router = useRouter();
  const [tab, setTab] = useState("chat");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const run = (action: () => Promise<unknown>) => {
    void query.action(action).catch(() => {});
  };
  if (query.isError)
    return (
      <div className="space-y-4 p-8" role="alert">
        <p>
          Không tải được notebook hoặc không xác minh được quyền nguồn. Nội dung
          được tạm ẩn.
        </p>
        <Button onClick={() => query.refetch()}>Thử lại</Button>
        <Button variant="link" asChild>
          <Link href="/ai">Về notebook</Link>
        </Button>
      </div>
    );
  if (!query.data)
    return (
      <p className="p-8" role="status">
        Đang tải notebook…
      </p>
    );
  const notebook = query.data;
  const selected = notebook.sources.filter(
    (source) => source.status === "READY" && !excluded.includes(source.id),
  );
  const visibleDraft = chat.draft?.refs.every((ref) =>
    notebook.sources.some(
      (source) =>
        source.id === ref.id &&
        source.revision === ref.revision &&
        source.status === "READY",
    ),
  );
  const panel = "min-h-0 rounded-xl border bg-white p-4 xl:block";
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 bg-slate-50 p-3 md:p-5 xl:h-[calc(100dvh-100px)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/ai"
            className="text-xs text-muted-foreground hover:underline"
          >
            Notebook của bạn
          </Link>
          <h1 className="mt-1 break-words text-xl font-semibold">
            {notebook.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            Riêng tư · {notebook.sources.length} nguồn
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setName(notebook.title);
              setRenaming((value) => !value);
            }}
          >
            Đổi tên
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={chat.busy || query.saving}
            onClick={() => {
              if (
                window.confirm(
                  "Xóa notebook và lịch sử? File gốc trong Tài liệu vẫn được giữ.",
                )
              )
                run(async () => {
                  await notebooksApi.remove(id);
                  router.push("/ai");
                });
            }}
          >
            Xóa notebook
          </Button>
        </div>
      </header>
      {renaming && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              await notebooksApi.rename(id, name);
              setRenaming(false);
            });
          }}
        >
          <Input
            aria-label="Tên notebook"
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button disabled={query.saving || !name.trim()}>Lưu</Button>
        </form>
      )}
      {query.actionError && (
        <p role="alert" className="text-sm text-red-700">
          Thao tác chưa hoàn tất. Kiểm tra quyền nguồn, giới hạn và kết nối rồi
          thử lại.
        </p>
      )}
      <nav aria-label="Vùng làm việc notebook" className="flex gap-2 xl:hidden">
        {[
          ["sources", "Nguồn"],
          ["chat", "Hỏi đáp"],
          ["studio", "Studio"],
        ].map(([value, label]) => (
          <Button
            key={value}
            aria-pressed={tab === value}
            variant={tab === value ? "default" : "outline"}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </nav>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className={`${panel} ${tab === "sources" ? "block" : "hidden"}`}>
          <SourcePanel
            id={id}
            sources={notebook.sources}
            selected={selected.map((source) => source.id)}
            busy={chat.busy}
            run={run}
            refresh={query.refresh}
            toggle={(sourceId) =>
              setExcluded((current) =>
                current.includes(sourceId)
                  ? current.filter((value) => value !== sourceId)
                  : [...current, sourceId],
              )
            }
          />
        </aside>
        <section
          aria-label="Hỏi đáp theo nguồn"
          className={`${panel} ${tab === "chat" ? "flex" : "hidden"} flex-col xl:flex`}
        >
          <h2 className="border-b pb-4 font-semibold">
            Hỏi đáp theo {selected.length} nguồn đã chọn
          </h2>
          <div
            className="min-h-0 flex-1 space-y-5 overflow-y-auto py-5"
            aria-live="polite"
            aria-busy={chat.busy}
          >
            {!notebook.messages.length && (
              <div className="py-8 text-sm leading-relaxed text-muted-foreground">
                <h3 className="mb-3 font-semibold text-foreground">
                  Bắt đầu từ tài liệu của bạn
                </h3>
                <p>
                  Thêm tài liệu ở Nguồn. Khi chỉ mục sẵn sàng, chọn nguồn rồi
                  đặt câu hỏi cụ thể. Mỗi câu trả lời có đoạn trích để đối
                  chiếu.
                </p>
                <p className="mt-3">
                  Muốn đọc toàn bộ nội dung? Dùng “Tóm tắt toàn văn” trong
                  Studio.
                </p>
              </div>
            )}
            {notebook.messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-lg border p-4 ${message.role === "USER" ? "bg-slate-50" : "bg-white"}`}
              >
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {message.role === "USER" ? "Bạn" : "Trợ lý tài liệu"}
                </p>
                {message.hidden ? (
                  <p className="text-sm text-muted-foreground">
                    Nội dung đã ẩn vì nguồn bị xóa, đổi phiên bản hoặc mất
                    quyền.
                  </p>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap break-words text-sm leading-7">
                      {message.content}
                    </div>
                    <Citations items={message.citations} notebookId={id} />
                    {message.role === "ASSISTANT" && (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={query.saving}
                        onClick={() =>
                          run(() =>
                            notebooksApi.note(id, {
                              title: "Đã lưu từ hỏi đáp",
                              messageId: message.id,
                            }),
                          )
                        }
                      >
                        Lưu vào ghi chú
                      </Button>
                    )}
                  </>
                )}
              </article>
            ))}
            {chat.busy && visibleDraft && (
              <article className="rounded-lg border p-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  {chat.stage} · Chưa hoàn tất
                </p>
                <div className="whitespace-pre-wrap break-words text-sm leading-7">
                  {chat.draft?.text || chat.draft?.question}
                </div>
              </article>
            )}
            {chat.error && (
              <p role="alert" className="text-sm text-red-700">
                {chat.error}
              </p>
            )}
          </div>
          <form
            className="space-y-2 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const value = question.trim();
              if (!value) return;
              setQuestion("");
              void chat.ask(value, selected);
            }}
          >
            <label htmlFor="notebook-question" className="text-sm font-medium">
              Câu hỏi
            </label>
            <Textarea
              id="notebook-question"
              rows={3}
              maxLength={4000}
              value={question}
              disabled={chat.busy}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Hỏi rõ nội dung bạn muốn tìm trong nguồn…"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                AI có thể sai. Kiểm tra trích dẫn trước khi sử dụng.
              </p>
              {chat.busy ? (
                <Button type="button" variant="outline" onClick={chat.cancel}>
                  Hủy trả lời
                </Button>
              ) : (
                <Button disabled={!selected.length || !question.trim()}>
                  Gửi
                </Button>
              )}
            </div>
          </form>
        </section>
        <aside className={`${panel} ${tab === "studio" ? "block" : "hidden"}`}>
          <StudioPanel notebook={notebook} saving={query.saving} run={run} />
        </aside>
      </div>
    </main>
  );
}
