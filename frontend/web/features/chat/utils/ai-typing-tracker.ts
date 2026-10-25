import type { ChatSocketAiTypingPayload } from "../types/chat-socket.types";

export const AI_TYPING_TIMEOUT_MS = 20000;

/** Each request expires independently. Completed requests reject delayed heartbeats. */
export function createAiTypingTracker(
  scope: { chatId: string; chatType: string; threadParentId: string | null },
  onChange: (active: boolean) => void,
) {
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const completed = new Map<string, ReturnType<typeof setTimeout>>();
  const report = () => onChange(pending.size > 0);
  const settle = (id: string) => {
    clearTimeout(pending.get(id));
    pending.delete(id);
    clearTimeout(completed.get(id));
    completed.set(id, setTimeout(() => completed.delete(id), 60000));
    report();
  };
  const receive = (event: ChatSocketAiTypingPayload) => {
    if (
      event.chatId !== scope.chatId || event.chatType !== scope.chatType ||
      (event.threadParentId ?? null) !== scope.threadParentId || !event.requestId
    ) return;
    if (!event.isTyping) return settle(event.requestId);
    if (completed.has(event.requestId)) return;
    clearTimeout(pending.get(event.requestId));
    pending.set(event.requestId, setTimeout(() => {
      pending.delete(event.requestId);
      report();
    }, AI_TYPING_TIMEOUT_MS));
    report();
  };
  const clear = () => {
    pending.forEach(clearTimeout);
    completed.forEach(clearTimeout);
    pending.clear();
    completed.clear();
  };
  return { receive, settle, clear, reset: () => { clear(); report(); } };
}
