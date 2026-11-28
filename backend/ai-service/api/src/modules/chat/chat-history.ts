import type { Source, Snapshot } from "../../common/types";
import { plainText } from "../../common/text";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export const NOTEBOOK_HISTORY_LIMIT = 20;
type StoredMessage = { role: string; content: string; sources: Snapshot[] };

export function conversationHistory(
  messages: StoredMessage[],
  selected: Source[],
): ChatTurn[] {
  const revisions = new Map(
    selected
      .filter((source) => source.status === "READY")
      .map((source) => [source.id, source.revision]),
  );
  const turns: ChatTurn[] = [];
  let user: ChatTurn | null = null;
  for (const message of messages) {
    if (
      !message.sources?.length ||
      !message.sources.every((ref) => revisions.get(ref.id) === ref.revision)
    ) {
      user = null;
      continue;
    }
    const content = message.content
      .replace(/\[\[S\d+\]\]/g, "")
      .trim()
      .slice(0, 1000);
    if (!content) {
      user = null;
      continue;
    }
    if (message.role === "USER") user = { role: "user", content };
    else if (message.role === "ASSISTANT" && user) {
      turns.push(user, { role: "assistant", content });
      user = null;
    }
  }

  return turns.slice(-NOTEBOOK_HISTORY_LIMIT);
}

export function isFollowUp(question: string): boolean {
  const plain = plainText(question);
  if (
    /\b(?:huong dan|chi (?:toi|minh)|giup (?:toi|minh) (?:lam|bat dau))\b/.test(
      plain,
    ) ||
    /\b(?:(?:gio|bay gio|vay|the) )?(?:(?:toi|minh) )?(?:nen|can|phai) (?:lam gi|bat dau|lam buoc nao)|\b(?:buoc tiep theo|tiep theo lam gi|what should i do|what next|where should i start|how do i start)\b/.test(
      plain,
    )
  )
    return true;

  return (
    /\b(it|that|these|those|more|explain further)\b|(?:cái|điều|phần|ý) (?:đó|này)|giải thích thêm|nói rõ hơn|còn .* thì sao/i.test(
      question,
    ) ||
    /^(giải thích đi|là sao|ý là sao|explain|explain this)[?.!\s]*$/i.test(
      question.trim(),
    )
  );
}

export function retrievalQuestion(
  question: string,
  history: ChatTurn[],
  followUp = isFollowUp(question),
): string {
  if (!history.length || !followUp) return question;
  const prefix =
    "\nConversation context (resolve the topic only, not evidence):\n";
  const remaining = 4000 - question.length - prefix.length;
  if (remaining <= 0) return question;
  const context = history
    .slice(-2)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n")
    .slice(0, remaining)
    .replace(/[\uD800-\uDBFF]$/u, "");

  return question + prefix + context;
}
