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
      if (done) break;
      pending += decoder.decode(value, { stream: true }).replace(/\r/g, "");
      if (pending.length > 100000) throw new Error("Phản hồi vượt giới hạn");
      let boundary: number;
      while ((boundary = pending.indexOf("\n\n")) >= 0) {
        const event = parseEvent(pending.slice(0, boundary));
        pending = pending.slice(boundary + 2);
        if (!event) continue;
        if (event.event === "error")
          throw new Error(event.data.message || "AI chưa hoàn tất");
        if (event.event === "done") completed = true;
        onEvent(event);
      }
    }
    if (!completed)
      throw new Error(
        "Kết nối bị ngắt trước khi hoàn tất; yêu cầu không tự gửi lại.",
      );
  } finally {
    await reader.cancel().catch(() => {});
  }
}
