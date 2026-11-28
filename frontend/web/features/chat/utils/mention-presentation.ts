import { AI_BOT } from "../constants/chat-identity";
import type { UserProfileSnapshotResponse } from "../types/chat.types";

export interface MentionTextPart {
  text: string;
  source?: string;
  mention?: boolean;
  ai?: boolean;
}

export function getMentionNames(
  profiles: Record<string, UserProfileSnapshotResponse> = {},
) {
  return Object.values(profiles).flatMap((profile) =>
    [profile.fullName, ...(profile.mentionNames ?? [])].filter(
      (name): name is string => Boolean(name?.trim()),
    ),
  );
}

/** Match complete known names first, with boundaries so email addresses and name prefixes stay intact. */
export function splitMentionText(
  content: string,
  names: readonly string[] = [],
): MentionTextPart[] {
  const labels = [
    ...new Set(
      [AI_BOT.name, "ai", "All", "channel", "here", ...names].filter(Boolean),
    ),
  ]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(
    `(^|[\\s([{"'.,!?;:])(@(?:${labels.join("|")}))(?![\\p{L}\\p{N}_-])`,
    "giu",
  );
  const parts: MentionTextPart[] = [];
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index! + match[1].length;
    // Inline code remains literal. Fenced code is handled by the block formatter.
    if ((content.slice(0, start).match(/`/g)?.length ?? 0) % 2) continue;
    if (start > cursor) parts.push({ text: content.slice(cursor, start) });
    const ai = /^@ai(?: bot)?$/i.test(match[2]);
    parts.push({
      text: ai ? AI_BOT.mention : match[2],
      source: match[2],
      mention: true,
      ai,
    });
    cursor = start + match[2].length;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return parts.length ? parts : [{ text: content }];
}
