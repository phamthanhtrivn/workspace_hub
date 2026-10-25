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
import { AnswerContent } from "./answer-content";
import { SourcePanel } from "./source-panel";
import { StudioPanel } from "./studio-panel";
import { LoadingState } from "@/components/ui/loading-state";
import { Spinner } from "@/components/ui/spinner";
import type { NotebookActionKey, NotebookActionRunner } from "../types";

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
  const [pendingAction, setPendingAction] = useState<NotebookActionKey | null>(null);
  const run: NotebookActionRunner = (action, key) => {
    setPendingAction(key ?? null);
    void query.action(action).catch(() => {}).finally(() => setPendingAction(null));
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
      <LoadingState label="Đang tải notebook…" size={32} className="p-8" />
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
            loading={query.saving && pendingAction === "remove"}
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
                }, "remove");
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
            }, "rename");
          }}
        >
          <Input
            aria-label="Tên notebook"
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button loading={query.saving && pendingAction === "rename"} disabled={query.saving || !name.trim()}>Lưu</Button>
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
            pendingAction={query.saving ? pendingAction : null}
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
                    <Citations
                      items={message.citations}
                      notebookId={id}
                      markdown={message.role !== "USER"}
                      content={
                        ["FAILED", "CANCELLED"].includes(
                          message.summary_status || "",
                        )
                          ? "Bản tóm tắt chưa hoàn tất. Bạn có thể thử lại."
                          : message.content
                      }
                    />
                    {message.artifact_id &&
                      ["FAILED", "CANCELLED"].includes(
                        message.summary_status || "",
                      ) && (
                        <Button loading={query.saving && pendingAction === `summary:${message.id}`}
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          disabled={query.saving}
                          onClick={() =>
                            run(() =>
                              notebooksApi.artifact(
                                id,
                                "SUMMARY",
                                message.sources.map((source) => source.id),
                              ),
                              `summary:${message.id}`,
                            )
                          }
                        >
                          Thử tóm tắt lại
                        </Button>
                      )}
                    {message.role === "ASSISTANT" &&
                      (!message.artifact_id ||
                        message.summary_status === "COMPLETED") && (
                        <Button loading={query.saving && pendingAction === `note:${message.id}`}
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
                              `note:${message.id}`,
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
            {(chat.busy || chat.error) && visibleDraft && (
              <article className="rounded-lg border p-4">
                <p role={chat.busy ? "status" : undefined} className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {chat.busy && <Spinner size={14} />}
                  {chat.busy ? chat.stage : "Phần trả lời đã nhận được"} · Chưa
                  hoàn tất
                </p>
                {chat.draft?.text ? (
                  <AnswerContent content={chat.draft.text} />
                ) : (
                  <div className="whitespace-pre-wrap break-words text-sm leading-7">
                    {chat.draft?.question}
                  </div>
                )}
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
          <StudioPanel notebook={notebook} saving={query.saving} pendingAction={query.saving ? pendingAction : null} run={run} />
        </aside>
      </div>
    </main>
  );
}
