"use client";
import { useEffect, useRef, useState } from "react";
import { DialogPortal } from "@/components/ui/dialog";
import { History, Bot, ArrowLeft, SquarePen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetPanel } from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useWorkAssistant, workError } from "../hooks/use-work-assistant";
import type { Audience } from "../types";
import WorkConversationList from "./work-conversation-list";
import Message from "./work-assistant-message";
import WorkAssistantComposer from "./work-assistant-composer";
import {
  conversationContextKey,
  WORK_SUGGESTIONS,
} from "../constants/work-assistant";
import { Spinner } from "@/components/ui/spinner";

function Conversation({
  userId,
  projectId,
  audience,
  contextLabel,
  onClose,
  sessionId,
  onConversationChange,
}: {
  sessionId?: string;
  onConversationChange: (id: string) => void;
  userId: string;
  projectId?: string;
  audience: Audience;
  contextLabel: string;
  onClose: () => void;
}) {
  const [showConversations, setShowConversations] = useState(false);
  const assistant = useWorkAssistant(
    userId,
    projectId,
    audience,
    sessionId,
    showConversations,
  );
  const [question, setQuestion] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showConversations) content.current?.scrollTo({ top: 0 });
  }, [showConversations]);
  const modal = useMediaQuery("(max-width: 639px)");
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [
    assistant.messages.length,
    assistant.pending,
    assistant.reply,
    assistant.status,
  ]);
  const send = (text: string) => {
    if (!assistant.status) {
      setQuestion("");
      void assistant.send(text);
    }
  };
  const error =
    assistant.error ||
    (assistant.createConversation.isError
      ? workError(assistant.createConversation.error)
      : "") ||
    (assistant.history.isError ? workError(assistant.history.error) : "");

  return (
    <SheetPanel
      open
      onClose={onClose}
      modal={modal}
      id="work-assistant-panel"
      aria-label="AI Assistant"
      className="fixed bottom-20 right-4 z-50 flex max-h-[calc(100dvh-6rem)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-xl max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:rounded-none"
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info-content ring-1 ring-border/60">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-muted-foreground">
            Your tasks and planning
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            showConversations ? "Back to conversation" : "Conversations"
          }
          title={showConversations ? "Back to conversation" : "Conversations"}
          aria-expanded={showConversations}
          aria-controls="work-conversation-list"
          disabled={
            !!assistant.status ||
            assistant.createConversation.isPending ||
            !assistant.history.isSuccess
          }
          onClick={() => setShowConversations(!showConversations)}
        >
          {showConversations ? <ArrowLeft /> : <History />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="New conversation"
          title="New conversation"
          disabled={
            !!assistant.status ||
            assistant.createConversation.isPending ||
            !assistant.history.isSuccess
          }
          onClick={() =>
            assistant.createConversation.mutate(undefined, {
              onSuccess: (session) => onConversationChange(session.id),
            })
          }
        >
          <SquarePen />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close AI Assistant"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Context</span>
        <span
          id="work-scope"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-0.5 font-medium text-foreground shadow-2xs"
        >
          <span
            className="size-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          {contextLabel}
        </span>
      </div>
      <div
        ref={content}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {showConversations ? (
          <>
            {assistant.createConversation.isError && (
              <p role="alert" className="px-4 pt-4 text-xs text-destructive">
                {workError(assistant.createConversation.error)}
              </p>
            )}
            <WorkConversationList
              sessions={
                assistant.conversations.data?.pages.flatMap(
                  (page) => page.sessions,
                ) ?? []
              }
              activeId={assistant.history.data?.pages[0]?.id}
              loading={assistant.conversations.isPending}
              error={
                assistant.conversations.isError
                  ? workError(assistant.conversations.error)
                  : undefined
              }
              hasMore={assistant.conversations.hasNextPage}
              loadingMore={assistant.conversations.isFetchingNextPage}
              onLoadMore={() => void assistant.conversations.fetchNextPage()}
              onRetry={() => void assistant.conversations.refetch()}
              onSelect={(id) => {
                setShowConversations(false);
                onConversationChange(id);
              }}
            />
          </>
        ) : (
          <div
            className="space-y-4 p-4"
            role="log"
            aria-label="Conversation history"
            aria-live="polite"
            aria-relevant="additions"
          >
            {assistant.history.hasNextPage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                loading={assistant.history.isFetchingNextPage}
                onClick={() => void assistant.history.fetchNextPage()}
              >
                Earlier messages
              </Button>
            )}
            {assistant.history.isPending && (
              <p className="text-xs text-muted-foreground">
                Loading conversation...
              </p>
            )}
            {!assistant.messages.length &&
              !assistant.pending &&
              assistant.history.isSuccess && (
                <div className="space-y-4 py-4">
                  <div>
                    <h3 className="font-medium">
                      What would you like to work on?
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ask a question or choose a starting point.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {WORK_SUGGESTIONS.map(({ label, question: prompt }) => (
                      <Button
                        key={label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto min-h-10 justify-start whitespace-normal rounded-xl text-left"
                        disabled={!!assistant.status}
                        onClick={() => send(prompt)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            {!assistant.history.isError &&
              assistant.messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
            {assistant.pending && <Message message={assistant.pending} />}
            {assistant.reply &&
              !assistant.messages.some(
                (message) => message.id === assistant.reply?.id,
              ) && (
                <div aria-busy={assistant.streaming}>
                  <Message message={assistant.reply} />
                  {assistant.streaming && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Writing response…
                    </p>
                  )}
                </div>
              )}
            {assistant.status && (
              <p
                role="status"
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Spinner size={14} />
                {assistant.status}
              </p>
            )}
            {assistant.notice && (
              <p role="status" className="text-xs text-muted-foreground">
                {assistant.notice}
              </p>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>
      {!showConversations && (
        <WorkAssistantComposer
          question={question}
          onQuestionChange={setQuestion}
          onSend={send}
          onStop={() => void assistant.stop()}
          busy={!!assistant.status}
          disabled={!assistant.history.isSuccess}
          error={error}
          canRetry={
            assistant.history.isError ||
            Boolean(assistant.error && assistant.pending)
          }
          retrying={assistant.history.isFetching}
          onRetry={() => {
            if (assistant.history.isError) {
              void assistant.history.refetch();
            } else if (
              assistant.error &&
              assistant.pending &&
              !assistant.status
            ) {
              void assistant.send(assistant.pending.content);
            }
          }}
        />
      )}
    </SheetPanel>
  );
}

export default function WorkAssistantPanel({
  userId,
  projectId,
  audience,
  contextLabel,
  onClose,
}: {
  userId: string;
  projectId?: string;
  audience: Audience;
  contextLabel: string;
  onClose: () => void;
}) {
  const scopeKey = conversationContextKey(projectId, audience);
  const [selectedSession, setSelectedSession] = useState<{
    scopeKey: string;
    sessionId?: string;
  }>({ scopeKey });
  const sessionId =
    selectedSession.scopeKey === scopeKey
      ? selectedSession.sessionId
      : undefined;

  return (
    <DialogPortal>
      <Conversation
        key={userId + ":" + scopeKey + ":" + (sessionId ?? "latest")}
        userId={userId}
        projectId={projectId}
        audience={audience}
        contextLabel={contextLabel}
        sessionId={sessionId}
        onConversationChange={(id) =>
          setSelectedSession({ scopeKey, sessionId: id })
        }
        onClose={onClose}
      />
    </DialogPortal>
  );
}
