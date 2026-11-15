"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  FileText,
  NotebookPen,
  RotateCcw,
  Send,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import type {
  Notebook,
  Source,
  NotebookActionKey,
  NotebookActionRunner,
} from "../types";
import type { useNotebookChat } from "../hooks/use-notebook";
import { notebooksApi } from "../api/notebooks.api";
import { Citations } from "./citations";
import { AnswerContent } from "./answer-content";

export function NotebookChatPanel({
  notebook,
  selected,
  chat,
  saving,
  pendingAction,
  run,
  onSources,
  onAddSources,
}: {
  notebook: Notebook;
  selected: Source[];
  chat: ReturnType<typeof useNotebookChat>;
  saving: boolean;
  pendingAction: NotebookActionKey | null;
  run: NotebookActionRunner;
  onSources: () => void;
  onAddSources: () => void;
}) {
  const [question, setQuestion] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const visibleDraft = chat.draft?.refs.every((ref) =>
    notebook.sources.some(
      (source) =>
        source.id === ref.id &&
        source.revision === ref.revision &&
        source.status === "READY",
    ),
  );
  useEffect(() => {
    const container = scroller.current;
    if (container && followLatest.current)
      container.scrollTop = container.scrollHeight;
  }, [chat.draft?.text, notebook.messages.length]);

  return (
    <section
      aria-label="Chat with sources"
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-control bg-primary-soft text-primary-soft-foreground">
            <Bot className="size-4" aria-hidden="true" />
          </span>
          Chat
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={onSources}
        >
          <FileText aria-hidden="true" />
          {selected.length} {selected.length === 1 ? "source" : "sources"}{" "}
          selected
        </Button>
      </header>
      <div
        ref={scroller}
        onScroll={(event) => {
          const view = event.currentTarget;
          followLatest.current =
            view.scrollHeight - view.scrollTop - view.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 md:p-5"
        aria-busy={chat.busy}
      >
        {!notebook.messages.length && !chat.busy && (
          <div className="mx-auto flex max-w-prose flex-col items-center gap-3 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-panel bg-primary-soft text-primary-soft-foreground">
              <Bot className="size-6" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-semibold">Ask about your documents</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Add a source, wait until it is ready, then select it to ask
              questions with citations.
            </p>
            {!selected.length && (
              <Button
                variant="outline"
                onClick={notebook.sources.length ? onSources : onAddSources}
              >
                <FileText aria-hidden="true" />
                {notebook.sources.length ? "Select sources" : "Add sources"}
              </Button>
            )}
          </div>
        )}
        {notebook.messages.map((message) => (
          <article
            key={message.id}
            className={
              message.role === "USER"
                ? "ml-4 min-w-0 rounded-panel bg-muted px-4 py-3 sm:ml-10"
                : "min-w-0 py-2"
            }
          >
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {message.role !== "USER" && (
                <Bot className="size-4 text-link" aria-hidden="true" />
              )}
              {message.role === "USER" ? "You" : "AI Assistant"}
            </p>
            {message.hidden ? (
              <p className="text-sm text-muted-foreground">
                Content is hidden because a source was removed, updated or is no
                longer accessible.
              </p>
            ) : (
              <>
                <Citations
                  items={message.citations}
                  notebookId={notebook.id}
                  markdown={message.role !== "USER"}
                  content={message.content}
                />
                {message.role === "ASSISTANT" && (
                  <Button
                    loading={saving && pendingAction === `note:${message.id}`}
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() =>
                      run(
                        () =>
                          notebooksApi.note(notebook.id, {
                            title: "Saved from chat",
                            messageId: message.id,
                          }),
                        `note:${message.id}`,
                      )
                    }
                  >
                    <NotebookPen aria-hidden="true" />
                    Save to notes
                  </Button>
                )}
              </>
            )}
          </article>
        ))}
        {(chat.busy || chat.error) && visibleDraft && (
          <article className="min-w-0 space-y-3 rounded-panel border border-border p-4">
            <p
              role={chat.busy ? "status" : undefined}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {chat.busy && <Spinner size={14} />}
              {chat.busy ? chat.stage : "Response received so far"} · Incomplete
            </p>
            {chat.draft?.text ? (
              <AnswerContent content={chat.draft.text} />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
                {chat.draft?.question}
              </p>
            )}
          </article>
        )}
        {chat.error && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive-content">
              {chat.error}
            </p>
            {chat.retryQuestion && (
              <Button
                variant="outline"
                disabled={chat.busy || !selected.length}
                onClick={() => void chat.ask(chat.retryQuestion, selected)}
              >
                <RotateCcw aria-hidden="true" />
                Retry question
              </Button>
            )}
          </div>
        )}
      </div>
      <form
        className="shrink-0 space-y-2 border-t border-border p-3 md:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const value = question.trim();
          if (!value || chat.busy || !selected.length) return;
          followLatest.current = true;
          setQuestion("");
          void chat.ask(value, selected);
        }}
      >
        <label htmlFor="notebook-question" className="sr-only">
          Question
        </label>
        <Textarea
          id="notebook-question"
          rows={2}
          maxLength={4000}
          value={question}
          disabled={chat.busy}
          onChange={(event) => setQuestion(event.target.value)}
          className="max-h-40 min-h-20 resize-y"
          placeholder={
            selected.length
              ? "Ask a question about your sources..."
              : "Select a ready source to start chatting..."
          }
          onKeyDown={(event) => {
            if (
              event.key !== "Enter" ||
              event.shiftKey ||
              event.nativeEvent.isComposing ||
              event.nativeEvent.keyCode === 229
            )
              return;
            event.preventDefault();
            if (
              !event.repeat &&
              !chat.busy &&
              question.trim() &&
              selected.length
            )
              event.currentTarget.form?.requestSubmit();
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            AI can make mistakes. Check the citations.
          </p>
          {chat.busy ? (
            <Button type="button" variant="outline" onClick={chat.cancel}>
              <Square aria-hidden="true" />
              Stop response
            </Button>
          ) : (
            <Button disabled={!selected.length || !question.trim()}>
              <Send aria-hidden="true" />
              Send
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
