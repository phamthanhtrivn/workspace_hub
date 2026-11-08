import { CONVERSATION_AI_MESSAGES } from './conversation-ai.messages';

export const AI_BOT_NAME = 'AI Bot';
export const AI_BOT_ID = '00000000-0000-4000-8000-0000000000a1';

/** Accept the visible bot label and the legacy trigger without leaking "Bot" into the question. */
export function aiQuestion(content: string): string | null {
  const match = content.match(/^\s*@ai(?:[ \t]+bot)?(?:\s+|$)([\s\S]*)/i);
  return match
    ? match[1].trim().slice(0, 4000) || CONVERSATION_AI_MESSAGES.emptyQuestion
    : null;
}
