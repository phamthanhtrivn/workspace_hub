import React from "react";
import { UserProfileResponse } from "../types/chat.types";

export const formatMessageContent = (
  content: string | undefined | null,
  memberProfiles?: Record<string, UserProfileResponse>
): (string | React.ReactNode)[] => {
  if (!content) return [content || ""];

  let parts: (string | React.ReactNode)[] = [content];

  const allProfiles = Object.values(memberProfiles || {})
    .map((profile: any) => ({
      userId: profile.userId,
      name: profile.fullName || "Ai đó",
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
              </span>
            );
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });

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
            </a>
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

export const renderMessageContent = (
  content: string | undefined | null,
  memberProfiles?: Record<string, UserProfileResponse>
) => {
  if (!content) return <p className="whitespace-pre-wrap">{content}</p>;
  const parts = formatMessageContent(content, memberProfiles);
  return <p className="whitespace-pre-wrap leading-relaxed">{parts}</p>;
};
