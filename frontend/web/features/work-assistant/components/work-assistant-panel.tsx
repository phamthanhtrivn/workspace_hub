"use client";
import { useEffect, useRef, useState } from "react";
import { DialogPortal } from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import {
  History,
  Bot,
  ArrowLeft,
  SquarePen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetPanel } from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useWorkAssistant, workError } from "../hooks/use-work-assistant";
import type { Audience } from "../types";
import WorkToday from "./work-today";
import WorkConversationList from "./work-conversation-list";
import Message from "./work-assistant-message";
import WorkAssistantComposer from "./work-assistant-composer";
import { WORK_SUGGESTIONS } from "../constants/work-assistant";
import { Spinner } from "@/components/ui/spinner";

function Conversation({
  userId,
  projectId,
  audience,
  onClose,
  onScopeChange,
  currentProjectId,
  sessionId,
  onConversationChange,
}: {
  sessionId?: string;
  onConversationChange: (id: string) => void;
  userId: string;
  projectId?: string;
  audience: Audience;
  currentProjectId?: string;
  onClose: () => void;
  onScopeChange: (scope: "personal" | "mine" | "project") => void;
}) {
  const assistant = useWorkAssistant(userId, projectId, audience, sessionId);
  const [question, setQuestion] = useState("");
  const [showConversations, setShowConversations] = useState(false);
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
      onClick={(event) => {
        if (
          (event.target as HTMLElement).closest(
            'a[href^="/projects/"],a[href^="/calendar?"]',
          )
        )
          onClose();
      }}
      className="fixed bottom-20 right-4 z-50 flex max-h-[calc(100dvh-6rem)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-xl max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:rounded-none"
    >
      <header className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <Bot className="size-5 shrink-0 text-link" aria-hidden="true" />
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
          aria-label={showConversations ? "Back to conversation" : "Conversations"}
          title={showConversations ? "Back to conversation" : "Conversations"}
          aria-expanded={showConversations}
          aria-controls="work-conversation-list"
          disabled={
            !!assistant.status || assistant.createConversation.isPending || !assistant.history.isSuccess
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
            !!assistant.status || assistant.createConversation.isPending
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
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <label htmlFor="work-scope" className="text-xs text-muted-foreground">
          Context
        </label>
        <CustomSelect
          id="work-scope"
          ariaLabel="Assistant context"
          disabled={!!assistant.status}
          value={projectId ? audience : "personal"}
          onChange={(value) =>
            onScopeChange(value as "personal" | "mine" | "project")
          }
          options={[
            { value: "personal", label: "My tasks · all projects" },
            ...(currentProjectId
              ? [
                  { value: "mine", label: "Current project · My tasks" },
                  {
                    value: "project",
                    label: "Current project · All tasks",
                  },
                ]
              : []),
          ]}
          className="min-w-0 flex-1"
          triggerClassName="w-full text-xs"
        />
      </div>
      <div
        ref={content}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {showConversations ? (
          <>
            {assistant.createConversation.isError && <p role="alert" className="px-4 pt-4 text-xs text-destructive">{workError(assistant.createConversation.error)}</p>}
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
          <>
            {assistant.overview.isPending && (
              <p role="status" className="p-4 text-xs text-muted-foreground">
                Loading your tasks...
              </p>
            )}
            {assistant.overview.isError && !assistant.history.isError && (
              <p role="alert" className="border-b p-4 text-xs text-destructive">
                {workError(assistant.overview.error)}
              </p>
            )}
            {assistant.overview.isSuccess && (
              <WorkToday data={assistant.overview.data} />
            )}
            <div
              className="space-y-3 p-4"
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
                <p className="text-xs text-muted-foreground">Loading conversation...</p>
              )}
              {!assistant.messages.length && assistant.history.isSuccess && (
                <div className="space-y-4 py-4">
                  <div>
                    <h3 className="font-medium">What would you like to work on?</h3>
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
                        className="h-auto min-h-10 justify-start whitespace-normal text-left"
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
                ) && <Message message={assistant.reply} />}
              {assistant.status && (
                <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner size={14} />
                  {assistant.status}
                </p>
              )}
              {assistant.notice && (
                <p role="status" className="text-xs text-muted-foreground">{assistant.notice}</p>
              )}
              <div ref={bottom} />
            </div>
          </>
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
          canRetry={assistant.history.isError}
          retrying={assistant.history.isFetching}
          onRetry={() => void assistant.history.refetch()}
        />
      )}
    </SheetPanel>
  );
}
export default function WorkAssistantPanel({
  userId,
  currentProjectId,
  onClose,
}: {
  userId: string;
  currentProjectId?: string;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<"personal" | "mine" | "project">(
    currentProjectId ? "mine" : "personal",
  );
  const [sessionId, setSessionId] = useState<string>();
  const scope = currentProjectId ? selection : "personal";
  return (
    <DialogPortal>
      <Conversation
        key={
          userId +
          ":" +
          (scope === "personal" ? "personal" : currentProjectId) +
          ":" +
          scope +
          ":" +
          (sessionId ?? "latest")
        }
        userId={userId}
        projectId={scope === "personal" ? undefined : currentProjectId}
        audience={scope === "project" ? "project" : "mine"}
        currentProjectId={currentProjectId}
        sessionId={sessionId}
        onConversationChange={setSessionId}
        onScopeChange={(value) => {
          setSessionId(undefined);
          setSelection(value);
        }}
        onClose={onClose}
      />
    </DialogPortal>
  );
}
