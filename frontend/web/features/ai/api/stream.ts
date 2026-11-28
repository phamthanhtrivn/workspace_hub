import { aiServiceMessage } from "@/lib/ai-feedback";

export type StreamEvent = {
  event: string;
  data: { text?: string; message?: string; stage?: string };
};

export function parseEvent(frame: string): StreamEvent | null {
  const lines = frame.split("\n");
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!event || !data) return null;

  return { event, data: JSON.parse(data) };
}

export async function readAnswer(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let completed = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += (
        done ? decoder.decode() : decoder.decode(value, { stream: true })
      ).replace(/\r/g, "");
      if (done && pending.trim()) pending += "\n\n";
      let boundary: number;
      while ((boundary = pending.indexOf("\n\n")) >= 0) {
        const event = parseEvent(pending.slice(0, boundary));
        pending = pending.slice(boundary + 2);
        if (!event) continue;
        if (event.event === "error")
          throw new Error(
            aiServiceMessage(
              event.data.message,
              "AI did not complete the response. Check your sources and try again.",
            ),
          );
        if (event.event === "done") completed = true;
        onEvent(event);
        if (completed) return;
      }
      if (pending.length > 100000)
        throw new Error("The response exceeds the size limit.");
      if (done) break;
    }
    if (!completed)
      throw new Error(
        "The connection closed before the response finished. Your request was not resent.",
      );
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
