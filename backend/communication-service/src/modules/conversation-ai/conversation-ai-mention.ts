import { CONVERSATION_AI_MESSAGES } from './conversation-ai.messages';

export const AI_BOT_NAME = 'AI Bot';
export const AI_BOT_ID = '00000000-0000-4000-8000-0000000000a1';

const QUESTION_MAX_LENGTH = 4000;
const MENTION_PATTERN =
  /(^|[\s([{"'.,!?;:])(@ai(?:[ \t]+bot)?)(?![\p{L}\p{N}_-])/giu;

/** Preserve offsets so literal mentions in Markdown remain part of the question. */
function maskCodeAndQuotes(content: string): string {
  let fence: { marker: string; length: number } | undefined;
  let quotedParagraph = false;
  let masked = content
    .split(/(?<=\n)/)
    .map((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line);
      let protectedLine = false;
      if (fence) {
        protectedLine = true;
        if (
          marker &&
          marker[1][0] === fence.marker &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        ) {
          fence = undefined;
        }
      } else if (/^ {0,3}>/.test(line)) {
        protectedLine = true;
        quotedParagraph = true;
      } else if (!line.trim()) {
        quotedParagraph = false;
      } else {
        // A quoted paragraph can continue without another > until a block break.
        const startsBlock =
          /^ {0,3}(?:#{1,6}\s|[-+*]\s|\d+[.)]\s|(?:[-*_]\s*){3,}$)/.test(line);
        if (quotedParagraph && !marker && !startsBlock) {
          protectedLine = true;
        } else {
          quotedParagraph = false;
          if (marker) {
            fence = { marker: marker[1][0], length: marker[1].length };
            protectedLine = true;
          } else {
            protectedLine = /^(?: {4}|\t)/.test(line);
          }
        }
      }

      return protectedLine ? line.replace(/[^\r\n]/g, ' ') : line;
    })
    .join('');

  // Pair equal-length backtick runs, including multiline inline code. Indexing
  // the next matching run avoids rescanning the input for unmatched delimiters.
  const runs = [...masked.matchAll(/`+/g)];
  const nextRun = new Map<number, number>();
  const closingRuns: Array<number | undefined> = [];
  for (let index = runs.length - 1; index >= 0; index--) {
    const length = runs[index][0].length;
    closingRuns[index] = nextRun.get(length);
    nextRun.set(length, index);
  }
  const parts: string[] = [];
  let cursor = 0;
  for (let index = 0; index < runs.length; index++) {
    const start = runs[index].index;
    let slashes = 0;
    for (let position = start - 1; masked[position] === '\\'; position--)
      slashes++;
    const closing = closingRuns[index];
    if (slashes % 2 || closing === undefined) continue;
    const end = runs[closing].index + runs[closing][0].length;
    if (/\r?\n[ \t]*\r?\n/.test(masked.slice(start, end))) continue;
    parts.push(
      masked.slice(cursor, start),
      masked.slice(start, end).replace(/[^\r\n]/g, ' '),
    );
    cursor = end;
    index = closing;
  }
  parts.push(masked.slice(cursor));
  masked = parts.join('');

  return masked;
}

/** Recognize authored mentions anywhere, retaining the rest of the full message. */
export function aiQuestion(content: string): string | null {
  const authored = maskCodeAndQuotes(content);
  const parts: string[] = [];
  let cursor = 0;
  let mentioned = false;
  for (const match of content.matchAll(MENTION_PATTERN)) {
    const start = match.index + match[1].length;
    let end = start + match[2].length;
    if (authored.slice(start, end) !== match[2]) continue;
    mentioned = true;
    // Remove the separator after the mention without rewriting message formatting.
    while (content[end] === ' ' || content[end] === '\t') end++;
    parts.push(content.slice(cursor, start));
    cursor = end;
  }
  if (!mentioned) return null;
  parts.push(content.slice(cursor));

  return (
    parts.join('').trim().slice(0, QUESTION_MAX_LENGTH) ||
    CONVERSATION_AI_MESSAGES.emptyQuestion
  );
}
