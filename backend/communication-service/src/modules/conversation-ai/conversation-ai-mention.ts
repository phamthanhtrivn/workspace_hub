import { findAuthoredMentions } from '../../common/utils/message-mention.utils';
import { CONVERSATION_AI_MESSAGES } from './conversation-ai.messages';

export const AI_BOT_NAME = 'AI Bot';
export const AI_BOT_ID = '00000000-0000-4000-8000-0000000000a1';

const QUESTION_MAX_LENGTH = 4000;
const MENTION_PATTERN =
  /(^|[\s([{"'.,!?;:])(@ai(?:[ \t]+bot)?)(?![\p{L}\p{N}_-])/giu;

/** Recognize authored mentions anywhere, retaining the rest of the full message. */
export function aiQuestion(content: string): string | null {
  const parts: string[] = [];
  let cursor = 0;
  let mentioned = false;
  for (const match of findAuthoredMentions(content, MENTION_PATTERN)) {
    const { start } = match;
    let { end } = match;
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
