"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DialogPortal } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  History,
  RotateCcw,
  Square,
  SquarePen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetPanel } from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { useWorkAssistant, workError } from "../hooks/use-work-assistant";
import type { Audience, WorkMessage } from "../types";
import WorkToday, { taskHref } from "./work-today";
import WorkConversationList from "./work-conversation-list";

function Message({ message }: { message: WorkMessage }) {
  const allowed = new Set(message.sources.map(taskHref));
  return (
    <article
      className={
        message.role === "user"
          ? "ml-8 rounded-xl bg-primary/10 p-3"
          : "mr-2 rounded-xl border bg-background p-3"
      }
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {message.role === "user" ? "Bạn" : "Trợ lý công việc"}
      </p>
      <div className="break-words text-sm leading-relaxed [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_td]:py-1 [&_td]:pr-2 [&_th]:pr-2">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          urlTransform={(url) => (allowed.has(url) ? url : "")}
          components={{
            a: ({ href, children }) =>
              href && allowed.has(href) ? (
                <Link href={href} className="text-primary underline">
                  {children}
                </Link>
              ) : (
                <span>{children}</span>
              ),
            img: () => null,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {message.context && !message.hidden && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {message.context.scope.projectId
            ? message.context.scope.audience === "project"
              ? "Toàn project"
              : "Việc của tôi"
            : "Cá nhân"}
          {" · "}
          {new Intl.DateTimeFormat("vi-VN", {
            timeZone: message.context.timeZone,
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(message.context.fetchedAt))}
        </p>
      )}
      {message.sources.length > 0 && (
        <Collapsible className="mt-3 text-xs">
          <CollapsibleTrigger className="cursor-pointer text-muted-foreground">
            Task đã tham khảo ({message.sources.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1">
              {message.sources.map((source) => (
                <li key={source.kind + source.id}>
                  <Link
                    className="text-primary underline underline-offset-2"
                    href={taskHref(source)}
                  >
                    {source.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  );
}
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
      aria-label="Trợ lý công việc"
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
      <header className="flex shrink-0 items-center gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Trợ lý công việc</h2>
          <p className="text-[11px] text-muted-foreground">
            Cuộc trò chuyện riêng · Chỉ tư vấn
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Danh sách cuộc trò chuyện"
          title="Danh sách cuộc trò chuyện"
          aria-expanded={showConversations}
          aria-controls="work-conversation-list"
          disabled={
            !!assistant.status || assistant.createConversation.isPending
          }
          onClick={() => setShowConversations(!showConversations)}
        >
          <History />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Tạo cuộc trò chuyện mới"
          title="Tạo cuộc trò chuyện mới"
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
          aria-label="Đóng trợ lý"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <label htmlFor="work-scope" className="text-xs text-muted-foreground">
          Phạm vi
        </label>
        <CustomSelect
          id="work-scope"
          ariaLabel="Phạm vi trợ lý"
          disabled={!!assistant.status}
          value={projectId ? audience : "personal"}
          onChange={(value) =>
            onScopeChange(value as "personal" | "mine" | "project")
          }
          options={[
            { value: "personal", label: "Cá nhân · tất cả dự án" },
            ...(currentProjectId
              ? [
                  { value: "mine", label: "Project đang xem · Việc của tôi" },
                  {
                    value: "project",
                    label: "Project đang xem · Toàn project",
                  },
                ]
              : []),
          ]}
          className="min-w-0 flex-1"
          triggerClassName="w-full text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Làm mới dữ liệu và hội thoại"
          disabled={!!assistant.status}
          onClick={() => {
            void assistant.history.refetch();
            void assistant.overview.refetch();
          }}
        >
          <RotateCcw />
        </Button>
      </div>
      <div
        ref={content}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {showConversations && (
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
        )}
        {assistant.overview.isPending && (
          <p role="status" className="p-4 text-xs text-muted-foreground">
            Đang cập nhật việc hôm nay…
          </p>
        )}
        {assistant.overview.isError && !assistant.history.isError && (
          <p role="alert" className="border-b p-4 text-xs text-destructive">
            {workError(assistant.overview.error)}
          </p>
        )}
        {assistant.overview.isSuccess && (
          <WorkToday data={assistant.overview.data} onAsk={send} />
        )}
        <div
          className="space-y-3 p-4"
          role="log"
          aria-label="Lịch sử trao đổi"
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
              Xem tin nhắn cũ hơn
            </Button>
          )}
          {assistant.history.isPending && (
            <p className="text-xs text-muted-foreground">Đang tải hội thoại…</p>
          )}
          {!assistant.messages.length && assistant.history.isSuccess && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Bạn có thể hỏi về task, deadline, tiến độ hoặc cách chia nhỏ công
              việc. Mình sẽ lấy dữ liệu mới cho mỗi câu hỏi.
            </p>
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
            <p role="status" className="text-xs text-muted-foreground">
              {assistant.status}
            </p>
          )}
          <div ref={bottom} />
        </div>
      </div>
      <form
        className="shrink-0 space-y-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          send(question);
        }}
      >
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <label className="sr-only" htmlFor="work-question">
          Câu hỏi cho trợ lý
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            id="work-question"
            rows={2}
            maxLength={4000}
            value={question}
            disabled={!!assistant.status || !assistant.history.isSuccess}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Hỏi về công việc của bạn…"
            className="max-h-32 min-h-16 flex-1 resize-y rounded-lg border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (question.trim()) send(question);
              }
            }}
          />
          {assistant.status ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Dừng câu trả lời"
              onClick={() => void assistant.stop()}
            >
              <Square />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label="Gửi câu hỏi"
              disabled={!question.trim() || !assistant.history.isSuccess}
            >
              <ArrowUp />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          AI có thể ước lượng sai. Kiểm tra task và deadline trước khi quyết
          định.
        </p>
      </form>
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
