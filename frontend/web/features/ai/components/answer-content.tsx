import type { Element, ElementContent, Root } from "hast";
import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function rehypeCitations() {
  function visit(parent: Root | Element) {
    if (
      parent.type === "element" &&
      ["a", "code", "pre"].includes(parent.tagName)
    )
      return;
    for (let index = 0; index < parent.children.length; index++) {
      const child = parent.children[index];
      if (child.type === "element") visit(child);
      if (child.type !== "text" || !/\[\[S\d+\]\]/.test(child.value)) continue;
      const parts: ElementContent[] = child.value
        .split(/(\[\[S\d+\]\])/g)
        .map((value) => {
          const label = /^\[\[(S\d+)\]\]$/.exec(value)?.[1];
          return label
            ? {
                type: "element",
                tagName: "span",
                properties: { "data-citation": label },
                children: [{ type: "text", value }],
              }
            : { type: "text", value };
        });
      parent.children.splice(index, 1, ...parts);
      index += parts.length - 1;
    }
  }
  return visit;
}

export function AnswerContent({
  content,
  renderCitation,
}: {
  content: string;
  renderCitation?: (label: string) => ReactNode;
}) {
  return (
    <div className="min-w-0 break-words text-sm leading-7 [overflow-wrap:anywhere] [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_h4]:my-3 [&_h4]:font-semibold [&_h5]:my-3 [&_h5]:font-semibold [&_h6]:my-3 [&_h6]:font-semibold [&>:first-child]:mt-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_li]:pl-1 [&_li::marker]:text-muted-foreground [&_li>p]:my-1 [&_strong]:font-semibold [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/25 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-50 [&_pre]:p-4 [&_pre]:text-xs [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:my-5 [&_th]:border [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:px-3 [&_td]:py-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeCitations]}
        skipHtml
        components={{
          span: ({ node, children }) => {
            const label = node?.properties["data-citation"];
            return typeof label === "string"
              ? (renderCitation?.(label) ?? children)
              : children;
          },
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => (
            <span className="text-muted-foreground">{alt}</span>
          ),
          table: ({ children }) => (
            <div className="my-4 max-w-full overflow-x-auto rounded-lg border">
              <Table unstyled className="w-full border-collapse text-sm">
                {children}
              </Table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
