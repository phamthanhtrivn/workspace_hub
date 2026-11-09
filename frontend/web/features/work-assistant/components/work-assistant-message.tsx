import Link from "next/link";
import { Bot, Calendar, CheckSquare, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { formatMessageScopeLabel } from "../constants/work-assistant";
import type { WorkMessage } from "../types";
import { taskHref } from "../utils/task-reference";
import { remarkTaskLinks } from "../utils/remark-task-links";

export default function WorkAssistantMessage({
  message,
}: {
  message: WorkMessage;
}) {
  const allowed = new Set(message.sources.map(taskHref));
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <article className="flex flex-col items-end">
        <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">
          You
        </p>
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-2xs">
          <div className="break-words [&_p+p]:mt-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              urlTransform={() => ""}
              components={{
                a: ({ children }) => <span>{children}</span>,
                img: () => null,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="min-w-0 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-info-soft text-info-content ring-1 ring-border/60">
            <Bot className="size-3.5" aria-hidden="true" />
          </span>
          AI Assistant
        </p>
        {message.context && !message.hidden && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 font-medium text-foreground/85">
              {formatMessageScopeLabel(message.context.scope)}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={message.context.fetchedAt}>
              {new Intl.DateTimeFormat("en-US", {
                timeZone: message.context.timeZone,
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(message.context.fetchedAt))}
            </time>
          </span>
        )}
      </div>
      <div className="break-words text-sm leading-relaxed text-foreground/95 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li+li]:mt-1.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_td]:border-t [&_td]:border-border/60 [&_td]:py-1.5 [&_td]:pr-2 [&_th]:pb-1.5 [&_th]:pr-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            [
              remarkTaskLinks,
              {
                sources: !message.hidden ? message.sources : [],
              },
            ],
          ]}
          skipHtml
          urlTransform={(url) => (allowed.has(url) ? url : "")}
          components={{
            a: ({ href, children }) =>
              href && allowed.has(href) ? (
                <Link
                  href={href}
                  className="font-medium text-link underline decoration-link/40 underline-offset-4 transition-colors hover:decoration-link"
                >
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
      {message.sources.length > 0 && (
        <Collapsible className="mt-3 border-t border-border/60 pt-2.5 text-xs">
          <CollapsibleTrigger className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Referenced tasks ({message.sources.length})</span>
            <ChevronDown
              className="size-3.5 transition-transform duration-150 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {message.sources.map((source) => (
                <li key={source.kind + source.id} className="max-w-full">
                  <Link
                    className="group/chip inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={taskHref(source)}
                  >
                    {source.kind === "calendar" ? (
                      <Calendar
                        className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckSquare
                        className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-primary"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{source.title}</span>
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
