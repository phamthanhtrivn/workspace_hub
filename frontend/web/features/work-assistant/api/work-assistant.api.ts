import { z } from "zod";
import { api } from "@/lib/axios";
import type {
  Audience,
  WorkMessage,
  WorkConversationPage,
  WorkOverview,
  WorkSession,
} from "../types";
const base = "/api/ai/work-assistant";
const reference = z.object({
  id: z.string().uuid(),
  kind: z.enum(["project", "calendar"]),
  projectId: z.string().uuid().optional(),
  title: z.string(),
  url: z.string(),
  dueAt: z.string().nullable(),
});
const message = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.array(reference),
  created_at: z.string(),
  hidden: z.boolean().optional(),
  context: z
    .object({
      scope: z.object({
        projectId: z.string().uuid().optional(),
        audience: z.enum(["mine", "project"]),
      }),
      fetchedAt: z.string(),
      timeZone: z.string(),
      days: z.union([z.literal(7), z.literal(30)]),
    })
    .nullish()
    .transform((value) => value ?? undefined),
});
const session = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  messages: z.array(message),
  nextCursor: z.string().uuid().nullable(),
});
export async function getSession(
  projectId?: string,
  before?: string,
  signal?: AbortSignal,
  sessionId?: string,
): Promise<WorkSession> {
  return session.parse(
    (
      await api.get(base + "/session", {
        params: { projectId, before, sessionId },
        signal,
      })
    ).data.data,
  );
}
export async function getOverview(
  projectId?: string,
  audience: Audience = "mine",
  signal?: AbortSignal,
  timeZone?: string,
): Promise<WorkOverview> {
  return (
    await api.get(base + "/overview", {
      params: { projectId, audience, timeZone },
      signal,
    })
  ).data.data;
}
export async function getConversations(
  projectId?: string,
  before?: string,
  signal?: AbortSignal,
): Promise<WorkConversationPage> {
  const response = await api.get(base + "/sessions", {
    params: { projectId, before },
    signal,
  });
  return response.data.data;
}
export async function createConversation(
  projectId?: string,
): Promise<WorkSession> {
  return session.parse(
    (await api.post(base + "/sessions", { projectId })).data.data,
  );
}
export async function cancelRequest(id: string) {
  await api.post(base + "/requests/" + id + "/cancel");
}
export type StreamEvent = { event: string; data: unknown };
export async function consumeEvents(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
) {
  const reader = stream.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    done = false;
  try {
    while (true) {
      const part = await reader.read();
      buffer = (
        buffer + decoder.decode(part.value, { stream: !part.done })
      ).replace(/\r\n/g, "\n");
      if (buffer.length > 1024 * 1024) throw new Error("Phản hồi quá lớn.");
      let split: number;
      while ((split = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const lines = block.split("\n");
        const event = lines
          .find((line) => line.startsWith("event:"))
          ?.slice(6)
          .trim();
        const data = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (event && data) {
          onEvent({ event, data: JSON.parse(data) });
          if (event === "done" || event === "error") done = true;
        }
      }
      if (part.done) break;
    }
    if (!done)
      throw new Error(
        "Kết nối bị gián đoạn. Hãy tải lại hội thoại trước khi thử lại.",
      );
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
export async function sendMessage(
  id: string,
  question: string,
  requestId: string,
  audience: Audience,
  signal: AbortSignal,
  onStatus: (status: string) => void,
  onDone: (message: WorkMessage) => void,
  timeZone?: string,
) {
  const response = await api.post<ReadableStream<Uint8Array>>(
    base + "/sessions/" + id + "/messages",
    { question, requestId, audience, timeZone },
    { adapter: "fetch", responseType: "stream", signal, timeout: 115000 },
  );
  await consumeEvents(response.data, ({ event, data }) => {
    if (event === "status")
      onStatus(z.object({ message: z.string() }).parse(data).message);
    if (event === "done")
      onDone(message.parse(z.object({ message }).parse(data).message));
    if (event === "error")
      throw new Error(z.object({ message: z.string() }).parse(data).message);
  });
}
