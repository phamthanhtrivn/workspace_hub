import type { StoredMessage } from "./work-assistant.types";

export const WORK_HISTORY_LIMIT = 20;
export const WORK_HISTORY_BYTES = 12000;
const MIN_MESSAGE_BYTES = 64;

function shorten(text: string, bytes: number) {
  if (encodedBytes(text) <= bytes) return text;

  const points = Array.from(text);
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = points.slice(0, middle).join("") + "…";
    if (encodedBytes(candidate) <= bytes) low = middle;
    else high = middle - 1;
  }

  return points.slice(0, low).join("") + "…";
}

function encodedBytes(text: string) {
  return Buffer.byteLength(JSON.stringify(text)) - 2;
}

/** Keep recent turns readable without letting old text displace fresh work data. */
export function workHistory(history: StoredMessage[]) {
  const messages = history
    .slice(-WORK_HISTORY_LIMIT)
    .filter((message) => !message.hidden && message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content
        .slice(0, message.role === "user" ? 1000 : 1500)
        .replace(/[\uD800-\uDBFF]$/u, ""),
    }));
  let remaining =
    WORK_HISTORY_BYTES -
    Buffer.byteLength(
      JSON.stringify(messages.map((message) => ({ ...message, content: "" }))),
    );
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const budget = remaining - index * MIN_MESSAGE_BYTES;
    message.content = shorten(message.content, budget);
    remaining -= encodedBytes(message.content);
  }

  return messages;
}
