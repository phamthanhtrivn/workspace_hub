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
import { Bot } from "lucide-react";
import type { NotebookActionKey, NotebookActionRunner } from "../types";

export function NotebookWorkspace({ id }: { id: string }) {
  const userId = useAppSelector((state) => state.auth.userId);

  return userId ? (
    <Workspace key={`${userId}-${id}`} id={id} />
  ) : (
    <p className="p-8">Please sign in to open your notebooks.</p>
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
  const [pendingAction, setPendingAction] = useState<NotebookActionKey | null>(
    null,
  );
  const run: NotebookActionRunner = (action, key) => {
    setPendingAction(key ?? null);
    void query
      .action(action)
      .catch(() => {})
      .finally(() => setPendingAction(null));
  };
  if (query.isError)
    return (
      <div className="space-y-4 p-8" role="alert">
        <p>
          Unable to load this notebook or verify source access. Content is
          temporarily hidden.
        </p>
        <Button onClick={() => query.refetch()}>Retry</Button>
        <Button variant="link" asChild>
          <Link href="/ai">Back to notebooks</Link>
        </Button>
      </div>
    );
  if (!query.data)
    return (
      <LoadingState label="Loading notebook..." size={32} className="p-8" />
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
  const panel = "min-h-0 rounded-xl border bg-background p-4 xl:block";

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 bg-muted/30 p-3 md:p-5 xl:h-[calc(100dvh-100px)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/ai"
            className="text-xs text-muted-foreground hover:underline"
          >
            Your notebooks
          </Link>
          <h1 className="mt-1 break-words text-xl font-semibold">
            {notebook.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            Private · {notebook.sources.length} sources
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
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={query.saving && pendingAction === "remove"}
            disabled={chat.busy || query.saving}
            onClick={() => {
              if (
                window.confirm(
                  "Delete this notebook and its history? Original files in Documents will be kept.",
                )
              )
                run(async () => {
                  await notebooksApi.remove(id);
                  router.push("/ai");
                }, "remove");
            }}
          >
            Delete notebook
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
            aria-label="Notebook title"
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            loading={query.saving && pendingAction === "rename"}
            disabled={query.saving || !name.trim()}
          >
            Save
          </Button>
        </form>
      )}
      {query.actionError && (
        <p role="alert" className="text-sm text-destructive">
          Unable to complete this action. Check source access and upload limits,
          then try again.
        </p>
      )}
      <nav aria-label="Notebook workspace" className="flex gap-2 xl:hidden">
        {[
          ["sources", "Sources"],
          ["chat", "Chat"],
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
          aria-label="Chat with sources"
          className={`${panel} ${tab === "chat" ? "flex" : "hidden"} flex-col xl:flex`}
        >
          <h2 className="flex items-center gap-2 border-b pb-4 font-semibold">
            <Bot className="size-5 text-link" aria-hidden="true" />
            AI Assistant
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {selected.length} sources selected
            </span>
          </h2>
          <div
            className="min-h-0 flex-1 space-y-5 overflow-y-auto py-5"
            aria-live="polite"
            aria-busy={chat.busy}
          >
            {!notebook.messages.length && (
              <div className="py-8 text-sm leading-relaxed text-muted-foreground">
                <h3 className="mb-3 font-semibold text-foreground">
                  Ask about your documents
                </h3>
                <p>
                  Add a source, wait until it is ready, then select it to ask
                  questions with citations.
                </p>
                <p className="mt-3">For a full-document summary, use Studio.</p>
              </div>
            )}
            {notebook.messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "USER"
                    ? "ml-6 rounded-xl bg-muted p-4"
                    : "min-w-0 py-3"
                }
              >
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {message.role !== "USER" && (
                    <Bot className="size-4" aria-hidden="true" />
                  )}
                  {message.role === "USER" ? "You" : "AI Assistant"}
                </p>
                {message.hidden ? (
                  <p className="text-sm text-muted-foreground">
                    Content is hidden because a source was removed, updated or
                    is no longer accessible.
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
                          ? "The summary is incomplete. Try again."
                          : message.content
                      }
                    />
                    {message.artifact_id &&
                      ["FAILED", "CANCELLED"].includes(
                        message.summary_status || "",
                      ) && (
                        <Button
                          loading={
                            query.saving &&
                            pendingAction === `summary:${message.id}`
                          }
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          disabled={query.saving}
                          onClick={() =>
                            run(
                              () =>
                                notebooksApi.artifact(
                                  id,
                                  "SUMMARY",
                                  message.sources.map((source) => source.id),
                                ),
                              `summary:${message.id}`,
                            )
                          }
                        >
                          Retry summary
                        </Button>
                      )}
                    {message.role === "ASSISTANT" &&
                      (!message.artifact_id ||
                        message.summary_status === "COMPLETED") && (
                        <Button
                          loading={
                            query.saving &&
                            pendingAction === `note:${message.id}`
                          }
                          className="mt-3"
                          size="sm"
                          variant="outline"
                          disabled={query.saving}
                          onClick={() =>
                            run(
                              () =>
                                notebooksApi.note(id, {
                                  title: "Saved from chat",
                                  messageId: message.id,
                                }),
                              `note:${message.id}`,
                            )
                          }
                        >
                          Save to notes
                        </Button>
                      )}
                  </>
                )}
              </article>
            ))}
            {(chat.busy || chat.error) && visibleDraft && (
              <article className="rounded-lg border p-4">
                <p
                  role={chat.busy ? "status" : undefined}
                  className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"
                >
                  {chat.busy && <Spinner size={14} />}
                  {chat.busy ? chat.stage : "Response received so far"} ·
                  Incomplete
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
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  {chat.error}
                </p>
                {chat.retryQuestion && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={chat.busy || !selected.length}
                    onClick={() => void chat.ask(chat.retryQuestion, selected)}
                  >
                    Retry question
                  </Button>
                )}
              </div>
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
              Question
            </label>
            <Textarea
              id="notebook-question"
              rows={3}
              maxLength={4000}
              value={question}
              disabled={chat.busy}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about your sources..."
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                AI can make mistakes. Check the citations.
              </p>
              {chat.busy ? (
                <Button type="button" variant="outline" onClick={chat.cancel}>
                  Stop response
                </Button>
              ) : (
                <Button disabled={!selected.length || !question.trim()}>
                  Send
                </Button>
              )}
            </div>
          </form>
        </section>
        <aside className={`${panel} ${tab === "studio" ? "block" : "hidden"}`}>
          <StudioPanel
            notebook={notebook}
            saving={query.saving}
            pendingAction={query.saving ? pendingAction : null}
            run={run}
          />
        </aside>
      </div>
    </main>
  );
}
