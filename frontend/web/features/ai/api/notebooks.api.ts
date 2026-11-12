import { api } from "@/lib/axios";
import { aiServiceMessage } from "@/lib/ai-feedback";
import { store } from "@/store/store";
import { notebookListSchema, notebookSchema } from "../types";
import { readAnswer, type StreamEvent } from "./stream";
import type { UploadBatch } from "../upload";

const path = (id: string) => `/api/ai/notebooks/${id}`;
export const notebooksApi = {
  list: async () =>
    notebookListSchema.parse((await api.get("/api/ai/notebooks")).data.data),
  get: async (id: string, signal?: AbortSignal) =>
    notebookSchema.parse((await api.get(path(id), { signal })).data.data),
  create: async (title: string): Promise<{ id: string }> =>
    (await api.post("/api/ai/notebooks", { title })).data.data,
  rename: (id: string, title: string) => api.patch(path(id), { title }),
  remove: (id: string) => api.delete(path(id)),
  checkUpload: (id: string, file: File, batch: UploadBatch) =>
    api.post(`${path(id)}/upload-checks`, file, {
      params: { name: file.name },
      timeout: 80000,
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Size": String(file.size),
        "X-Upload-Count": String(batch.count),
        "X-Upload-Bytes": String(batch.bytes),
      },
    }),
  add: (id: string, documentIds: string[]) =>
    api.post(`${path(id)}/sources`, {
      refs: documentIds.map((documentId) => ({ documentId })),
    }),
  source: async (
    id: string,
    sourceId: string,
    action: "remove" | "retry" | "preview",
  ): Promise<{ url?: string }> => {
    const result = (await api.post(`${path(id)}/sources/${sourceId}/${action}`))
      .data.data;

    return result.url
      ? { ...result, url: new URL(result.url, api.defaults.baseURL).toString() }
      : result;
  },
  sourceImage: async (
    id: string,
    sourceId: string,
    imageId: string,
  ): Promise<{ dataUrl: string; description: string }> =>
    (await api.post(`${path(id)}/sources/${sourceId}/images/${imageId}`)).data
      .data,
  note: (
    id: string,
    data: {
      title: string;
      content?: string;
      messageId?: string;
      noteId?: string;
    },
  ) => api.post(`${path(id)}/notes`, data),
  deleteNote: (id: string, noteId: string) =>
    api.delete(`${path(id)}/notes/${noteId}`),
  cancel: (requestId: string, runId?: string | null) =>
    api.post(`/api/ai/requests/${requestId}/cancel`, {
      runId: runId ?? undefined,
    }),
  answer: async (
    id: string,
    question: string,
    sourceIds: string[],
    requestId: string,
    signal: AbortSignal,
    onEvent: (event: StreamEvent) => void,
  ) => {
    const send = () =>
      fetch(
        `${String(api.defaults.baseURL || "").replace(/\/$/, "")}${path(id)}/messages`,
        {
          method: "POST",
          credentials: "include",
          signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${store.getState().auth.accessToken || ""}`,
          },
          body: JSON.stringify({ question, sourceIds, requestId }),
        },
      );
    let response = await send();
    // A 401 means this request never started generation. Refresh through the existing interceptor once.
    if (response.status === 401) {
      await response.body?.cancel();
      await notebooksApi.list();
      response = await send();
    }
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => null);
      throw new Error(
        aiServiceMessage(
          error?.message,
          `Unable to get an AI response (HTTP ${response.status}). Check source access and try again.`,
        ),
      );
    }
    await readAnswer(response.body, onEvent);
  },
};
