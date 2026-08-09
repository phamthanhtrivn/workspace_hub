import React from "react";
import { UserProfileResponse } from "../types/chat.types";

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
            className="bg-gray-100 text-red-500 font-mono px-1 py-0.5 rounded text-[11px] border border-gray-200"
          >
            {t.text}
          </code>
        );
      case "bold":
        return (
          <strong key={`bold-${index}`} className="font-bold text-gray-900">
            {t.text}
          </strong>
        );
      case "italic":
        return (
          <em key={`italic-${index}`} className="italic text-gray-800">
            {t.text}
          </em>
        );
      case "strike":
        return (
          <span key={`strike-${index}`} className="line-through text-gray-400">
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
  memberProfiles?: Record<string, UserProfileResponse>,
): (string | React.ReactNode)[] => {
  if (!content) return [content || ""];

  let parts: (string | React.ReactNode)[] = [content];

  // Process @All mention
  const searchAllStr = "@All";
  if (content.includes(searchAllStr)) {
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part, partIdx) => {
      if (typeof part === "string") {
        const split = part.split(searchAllStr);
        split.forEach((s, idx) => {
          newParts.push(s);
          if (idx < split.length - 1) {
            newParts.push(
              <span
                key={`all-${partIdx}-${idx}`}
                className="font-semibold text-blue-600 px-1 rounded transition-colors"
              >
                {searchAllStr}
              </span>,
            );
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  }

  const allProfiles = Object.values(memberProfiles || {})
    .map((profile: any) => ({
      userId: profile.userId,
      name: profile.fullName || "Someone",
    }))
    .sort((a: any, b: any) => b.name.length - a.name.length);

  allProfiles.forEach(({ userId, name }: any) => {
    const searchStr = `@${name}`;
    if (!content.includes(searchStr)) return;

    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part, partIdx) => {
      if (typeof part === "string") {
        const split = part.split(searchStr);
        split.forEach((s, idx) => {
          newParts.push(s);
          if (idx < split.length - 1) {
            newParts.push(
              <span
                key={`${userId}-${partIdx}-${idx}`}
                className="font-semibold text-blue-600 px-1 rounded transition-colors"
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
            className="text-blue-500 hover:underline break-all"
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
              className="text-blue-500 hover:underline break-all"
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
  memberProfiles?: Record<string, UserProfileResponse>,
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
  memberProfiles?: Record<string, UserProfileResponse>,
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
              className="bg-gray-950 text-gray-100 font-mono text-[11px] p-3 rounded-lg overflow-x-auto max-w-full my-1.5 border border-gray-800 leading-normal select-text"
            >
              <code>{part.content.trim()}</code>
            </pre>
          );
        }

        const lines = part.content.split("\n");

        interface BlockNode {
          type:
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

        lines.forEach((line) => {
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
        });

        return (
          <div key={`text-block-${partIdx}`} className="space-y-1 w-full">
            {nodes.map((node, nodeIdx) => {
              if (node.type === "heading") {
                const HeadingTag = `h${node.level}` as any;
                const classMap: Record<number, string> = {
                  1: "text-lg font-bold text-gray-950 mt-2 mb-1",
                  2: "text-base font-bold text-gray-950 mt-1.5 mb-1",
                  3: "text-sm font-semibold text-gray-950 mt-1 mb-0.5",
                };
                const className =
                  classMap[node.level!] ||
                  "text-xs font-semibold text-gray-950";
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
                    className="border-l-4 border-gray-300 px-3 py-1  my-1 text-gray-600 bg-gray-100 rounded-r-md italic text-xs leading-relaxed"
                  >
                    {formatMessageContentAndStyles(node.text!, memberProfiles)}
                  </blockquote>
                );
              }

              if (node.type === "bullet_list") {
                return (
                  <ul
                    key={`bullet-${nodeIdx}`}
                    className="list-disc list-inside pl-4 text-xs text-gray-800 my-1 space-y-0.5"
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
                    className="list-decimal list-inside pl-4 text-xs text-gray-800 my-1 space-y-0.5"
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
  memberProfiles?: Record<string, UserProfileResponse>,
) => {
  if (!content) return <p className="whitespace-pre-wrap">{content}</p>;
  return (
    <div className="whitespace-pre-wrap leading-relaxed select-text">
      {parseBlocks(content, memberProfiles)}
    </div>
  );
};
