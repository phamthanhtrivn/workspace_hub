import Link from "next/link";
import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { WorkMessage } from "../types";
import { taskHref } from "./work-today";

export default function WorkAssistantMessage({ message }: { message: WorkMessage }) {
  const allowed = new Set(message.sources.map(taskHref));
  return (
    <article
      className={
        message.role === "user"
          ? "ml-8 rounded-xl bg-muted px-4 py-3"
          : "min-w-0 py-2"
      }
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {message.role !== "user" && <Bot className="size-4" aria-hidden="true" />}
        {message.role === "user" ? "You" : "AI Assistant"}
      </p>
      <div className="break-words text-sm leading-relaxed [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_td]:py-1 [&_td]:pr-2 [&_th]:pr-2">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          urlTransform={(url) => (allowed.has(url) ? url : "")}
          components={{
            a: ({ href, children }) =>
              href && allowed.has(href) ? (
                <Link href={href} className="text-link underline">
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
        <p className="mt-2 text-xs text-muted-foreground">
          {message.context.scope.projectId
            ? message.context.scope.audience === "project"
              ? "Entire project"
              : "My tasks"
            : "Personal"}
          {" · "}
          {new Intl.DateTimeFormat("en-US", {
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
            Referenced tasks ({message.sources.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1">
              {message.sources.map((source) => (
                <li key={source.kind + source.id}>
                  <Link
                    className="text-link underline underline-offset-2"
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
