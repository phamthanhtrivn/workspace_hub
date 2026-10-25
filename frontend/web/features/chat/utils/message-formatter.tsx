import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { UserProfileSnapshotResponse } from "../types/chat.types";

// Helper to parse inline styles (Bold, Italic, Strikethrough, Inline Code)
export const parseInlineStyles = (
  text: string,
): (string | React.ReactNode)[] => {
  if (!text) return [];

  const codeRegex = /`([^`]+)`/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const italicRegex = /\*([^*]+)\*/g;
  const strikeRegex = /~~([^~]+)~~/g;

  interface Token {
    text: string;
    type: "text" | "bold" | "italic" | "strike" | "code";
  }
  let tokens: Token[] = [{ text, type: "text" }];

  const splitTokens = (
    currentTokens: Token[],
    regex: RegExp,
    type: Token["type"],
  ): Token[] => {
    const result: Token[] = [];
    currentTokens.forEach((token) => {
      if (token.type !== "text") {
        result.push(token);
        return;
      }

      regex.lastIndex = 0;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(token.text)) !== null) {
        const matchIndex = match.index;
        const matchedText = match[1];

        if (matchIndex > lastIndex) {
          result.push({
            text: token.text.substring(lastIndex, matchIndex),
            type: "text",
          });
        }

        result.push({
          text: matchedText,
          type,
        });

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < token.text.length) {
        result.push({
          text: token.text.substring(lastIndex),
          type: "text",
        });
      }
    });
    return result;
  };

  tokens = splitTokens(tokens, codeRegex, "code");
  tokens = splitTokens(tokens, boldRegex, "bold");
  tokens = splitTokens(tokens, italicRegex, "italic");
  tokens = splitTokens(tokens, strikeRegex, "strike");

  return tokens.map((t, index) => {
    switch (t.type) {
      case "code":
        return (
          <code
            key={`inline-code-${index}`}
            className="bg-muted text-destructive-content font-mono px-1 py-0.5 rounded text-[11px] border border-border"
          >
            {t.text}
          </code>
        );
      case "bold":
        return (
          <strong key={`bold-${index}`} className="font-bold text-foreground">
            {t.text}
          </strong>
        );
      case "italic":
        return (
          <em key={`italic-${index}`} className="italic text-foreground">
            {t.text}
          </em>
        );
      case "strike":
        return (
          <span key={`strike-${index}`} className="line-through text-muted-foreground">
            {t.text}
          </span>
        );
      default:
        return t.text;
    }
  });
};

export const formatMessageContent = (
  content: string | undefined | null,
  memberProfiles?: Record<string, UserProfileSnapshotResponse>,
): (string | React.ReactNode)[] => {
  if (!content) return [content || ""];

  let parts: (string | React.ReactNode)[] = [content];

  // 1. Process Special Mentions (@All, @all, @channel, @here)
  const specialMentions = ["@All", "@all", "@channel", "@here"];
  specialMentions.forEach((specialStr) => {
    if (!content.includes(specialStr)) return;
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part, partIdx) => {
      if (typeof part === "string") {
        const split = part.split(specialStr);
        split.forEach((s, idx) => {
          newParts.push(s);
          if (idx < split.length - 1) {
            newParts.push(
              <span
                key={`special-${specialStr}-${partIdx}-${idx}`}
                className="font-semibold text-info-content bg-info-soft/80 px-1.5 py-0.5 rounded-md transition-colors"
              >
                {specialStr}
              </span>,
            );
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });

  // 2. Process Member Profile Mentions from memberProfiles map
  const allProfiles = Object.values(memberProfiles || {})
    .map((profile: any) => ({
      userId: profile.userId || profile.id,
      name: profile.fullName || profile.displayName || "Someone",
    }))
    .filter((p) => p.name && p.name !== "Someone")
    .sort((a, b) => b.name.length - a.name.length);

  allProfiles.forEach(({ userId, name }: any) => {
    const searchStr = `@${name}`;
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part, partIdx) => {
      if (typeof part === "string") {
        const split = part.split(searchStr);
        split.forEach((s, idx) => {
          newParts.push(s);
          if (idx < split.length - 1) {
            newParts.push(
              <span
                key={`user-${userId}-${partIdx}-${idx}`}
                className="font-semibold text-info-content bg-info-soft/80 px-1.5 py-0.5 rounded-md hover:bg-info-soft transition-colors cursor-pointer"
              >
                {searchStr}
              </span>,
            );
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });

  // 3. Fallback General Mention Regex for single-word @mentions (no spaces allowed to prevent swallowing following text)
  const mentionRegex = /@([\p{L}\p{N}_\-]+)/gu;
  const fallbackParts: (string | React.ReactNode)[] = [];
  parts.forEach((part, partIdx) => {
    if (typeof part === "string") {
      let lastIdx = 0;
      let match;
      mentionRegex.lastIndex = 0;
      while ((match = mentionRegex.exec(part)) !== null) {
        const matchIdx = match.index;
        const fullMention = match[0];
        if (matchIdx > lastIdx) {
          fallbackParts.push(part.substring(lastIdx, matchIdx));
        }
        fallbackParts.push(
          <span
            key={`mention-regex-${partIdx}-${matchIdx}`}
            className="font-semibold text-info-content bg-info-soft/80 px-1.5 py-0.5 rounded-md hover:bg-info-soft transition-colors cursor-pointer"
          >
            {fullMention}
          </span>,
        );
        lastIdx = mentionRegex.lastIndex;
      }
      if (lastIdx < part.length) {
        fallbackParts.push(part.substring(lastIdx));
      }
    } else {
      fallbackParts.push(part);
    }
  });
  parts = fallbackParts;

  // Process Markdown Links [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let mdLinkParts: (string | React.ReactNode)[] = [];
  parts.forEach((part, partIdx) => {
    if (typeof part === "string") {
      let lastIdx = 0;
      let match;
      mdLinkRegex.lastIndex = 0;
      while ((match = mdLinkRegex.exec(part)) !== null) {
        const matchIdx = match.index;
        const linkText = match[1];
        const linkUrl = match[2];
        if (matchIdx > lastIdx) {
          mdLinkParts.push(part.substring(lastIdx, matchIdx));
        }
        mdLinkParts.push(
          <a
            key={`mdlink-${partIdx}-${matchIdx}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info-content hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {linkText}
          </a>,
        );
        lastIdx = mdLinkRegex.lastIndex;
      }
      if (lastIdx < part.length) {
        mdLinkParts.push(part.substring(lastIdx));
      }
    } else {
      mdLinkParts.push(part);
    }
  });
  parts = mdLinkParts;

  // Process URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const finalParts: (string | React.ReactNode)[] = [];
  parts.forEach((part, partIdx) => {
    if (typeof part === "string") {
      const split = part.split(urlRegex);
      split.forEach((s, idx) => {
        if (s.match(urlRegex)) {
          finalParts.push(
            <a
              key={`url-${partIdx}-${idx}`}
              href={s}
              target="_blank"
              rel="noopener noreferrer"
              className="text-info-content hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {s}
            </a>,
          );
        } else if (s) {
          finalParts.push(s);
        }
      });
    } else {
      finalParts.push(part);
    }
  });

  return finalParts;
};

export const formatMessageContentAndStyles = (
  content: string | undefined | null,
  memberProfiles?: Record<string, UserProfileSnapshotResponse>,
): React.ReactNode[] => {
  const parts = formatMessageContent(content, memberProfiles);
  const finalParts: React.ReactNode[] = [];

  parts.forEach((part) => {
    if (typeof part === "string") {
      finalParts.push(...parseInlineStyles(part));
    } else {
      finalParts.push(part);
    }
  });

  return finalParts;
};

export const parseBlocks = (
  content: string | undefined | null,
  memberProfiles?: Record<string, UserProfileSnapshotResponse>,
): React.ReactNode => {
  if (!content) return null;

  const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
  const parts: { type: "text" | "code"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const matchIndex = match.index;
    const codeContent = match[1];

    if (matchIndex > lastIndex) {
      parts.push({
        type: "text",
        content: content.substring(lastIndex, matchIndex),
      });
    }

    parts.push({
      type: "code",
      content: codeContent,
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.substring(lastIndex),
    });
  }

  return (
    <div className="space-y-1 w-full">
      {parts.map((part, partIdx) => {
        if (part.type === "code") {
          return (
            <pre
              key={`block-code-${partIdx}`}
              className="bg-primary text-primary-foreground font-mono text-[11px] p-3 rounded-lg overflow-x-auto max-w-full my-1.5 border border-input leading-normal select-text"
            >
              <code>{part.content.trim()}</code>
            </pre>
          );
        }

        const lines = part.content.split("\n");

        interface BlockNode {
          type:
            | "table"
            | "heading"
            | "quote"
            | "bullet_list"
            | "number_list"
            | "paragraph"
            | "empty";
          level?: number;
          text?: string;
          items?: string[];
        }

        const nodes: BlockNode[] = [];
        let currentList: BlockNode | null = null;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          const next = lines[lineIndex + 1];
          if (line.includes("|") && next && /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(next)) {
            const tableLines = [line, next];
            lineIndex++;
            while (lineIndex + 1 < lines.length && lines[lineIndex + 1].trim() && lines[lineIndex + 1].includes("|")) {
              tableLines.push(lines[++lineIndex]);
            }
            currentList = null;
            nodes.push({ type: "table", text: tableLines.join("\n") });
            continue;
          }
          const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
          const bulletMatch = line.match(/^[\-\*]\s+(.*)$/);
          const numberMatch = line.match(/^\d+\.\s+(.*)$/);

          if (headingMatch) {
            currentList = null;
            nodes.push({
              type: "heading",
              level: headingMatch[1].length,
              text: headingMatch[2],
            });
          } else if (line.startsWith("> ")) {
            currentList = null;
            nodes.push({
              type: "quote",
              text: line.substring(2),
            });
          } else if (bulletMatch) {
            if (currentList && currentList.type === "bullet_list") {
              currentList.items!.push(bulletMatch[1]);
            } else {
              currentList = {
                type: "bullet_list",
                items: [bulletMatch[1]],
              };
              nodes.push(currentList);
            }
          } else if (numberMatch) {
            if (currentList && currentList.type === "number_list") {
              currentList.items!.push(numberMatch[1]);
            } else {
              currentList = {
                type: "number_list",
                items: [numberMatch[1]],
              };
              nodes.push(currentList);
            }
          } else if (line.trim() === "") {
            currentList = null;
            nodes.push({ type: "empty" });
          } else {
            currentList = null;
            nodes.push({
              type: "paragraph",
              text: line,
            });
          }
        }

        return (
          <div key={`text-block-${partIdx}`} className="space-y-1 w-full">
            {nodes.map((node, nodeIdx) => {
              if (node.type === "table") {
                return (
                  <div key={`table-${nodeIdx}`} role="region" aria-label="Bảng trong tin nhắn" tabIndex={0}
                    className="my-3 max-w-full overflow-x-auto rounded-lg border border-border bg-card whitespace-normal focus-visible:outline-2 focus-visible:outline-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
                      table: ({ children }) => <Table unstyled className="w-full min-w-[28rem] border-collapse text-left text-sm leading-relaxed">{children}</Table>,
                      tr: ({ children }) => <TableRow unstyled>{children}</TableRow>,
                      thead: ({ children }) => <TableHeader unstyled className="bg-muted text-foreground">{children}</TableHeader>,
                      th: ({ children, style }) => <TableHead unstyled scope="col" style={style} className="border-b border-r border-border px-3 py-2.5 font-semibold last:border-r-0">{children}</TableHead>,
                      td: ({ children, style }) => <TableCell unstyled style={style} className="border-b border-r border-border px-3 py-2 align-top last:border-r-0">{children}</TableCell>,
                      tbody: ({ children }) => <TableBody unstyled className="[&_tr:nth-child(even)]:bg-muted/40 [&_tr:last-child_td]:border-b-0">{children}</TableBody>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-link underline underline-offset-2">{children}</a>,
                      img: ({ alt }) => <span>{alt}</span>,
                    }}>{node.text!}</ReactMarkdown>
                  </div>
                );
              }
              if (node.type === "heading") {
                const HeadingTag = `h${node.level}` as any;
                const classMap: Record<number, string> = {
                  1: "text-xl font-black text-foreground mt-3 mb-1.5 leading-tight tracking-tight",
                  2: "text-lg font-extrabold text-foreground mt-2.5 mb-1.5 leading-tight tracking-tight",
                  3: "text-base font-extrabold text-foreground mt-2 mb-1 leading-snug",
                };
                const className =
                  classMap[node.level!] ||
                  "text-sm font-bold text-foreground mt-1.5 mb-0.5 leading-snug";
                return (
                  <HeadingTag key={`h-${nodeIdx}`} className={className}>
                    {formatMessageContentAndStyles(node.text!, memberProfiles)}
                  </HeadingTag>
                );
              }

              if (node.type === "quote") {
                return (
                  <blockquote
                    key={`quote-${nodeIdx}`}
                    className="border-l-4 border-input px-3 py-1  my-1 text-muted-foreground bg-muted rounded-r-md italic text-xs leading-relaxed"
                  >
                    {formatMessageContentAndStyles(node.text!, memberProfiles)}
                  </blockquote>
                );
              }

              if (node.type === "bullet_list") {
                return (
                  <ul
                    key={`bullet-${nodeIdx}`}
                    className="list-disc list-inside pl-4 text-xs text-foreground my-1 space-y-0.5"
                  >
                    {node.items!.map((item, itemIdx) => (
                      <li key={`bullet-item-${itemIdx}`}>
                        {formatMessageContentAndStyles(item, memberProfiles)}
                      </li>
                    ))}
                  </ul>
                );
              }

              if (node.type === "number_list") {
                return (
                  <ol
                    key={`number-${nodeIdx}`}
                    className="list-decimal list-inside pl-4 text-xs text-foreground my-1 space-y-0.5"
                  >
                    {node.items!.map((item, itemIdx) => (
                      <li key={`number-item-${itemIdx}`}>
                        {formatMessageContentAndStyles(item, memberProfiles)}
                      </li>
                    ))}
                  </ol>
                );
              }

              if (node.type === "empty") {
                return nodeIdx < nodes.length - 1 ? (
                  <div key={`empty-${nodeIdx}`} className="h-2"></div>
                ) : null;
              }

              // paragraph
              return (
                <div
                  key={`line-${nodeIdx}`}
                  className="min-h-[16px] break-words"
                >
                  {formatMessageContentAndStyles(node.text!, memberProfiles)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const renderMessageContent = (
  content: string | undefined | null,
  memberProfiles?: Record<string, UserProfileSnapshotResponse>,
) => {
  if (!content) return <p className="whitespace-pre-wrap">{content}</p>;
  return (
    <div className="whitespace-pre-wrap leading-relaxed select-text">
      {parseBlocks(content, memberProfiles)}
    </div>
  );
};
