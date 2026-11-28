import { api } from "@/lib/axios";
import { aiServiceMessage } from "@/lib/ai-feedback";
import { store } from "@/store/store";
import { notebookListSchema, notebookSchema } from "../types";
import type { NotebookInput } from "../types/notebook-presentation";
import { readAnswer, type StreamEvent } from "./stream";
import {
  notebookPageSchema,
  NOTEBOOK_PAGE_SIZE,
  type NotebookListParams,
} from "../types/notebook-list";

const path = (id: string) => `/api/ai/notebooks/${id}`;
export const notebooksApi = {
  addCopies: (
    id: string,
    documents: { id: string; versionId?: string }[],
    operationId: string,
    signal?: AbortSignal,
  ) =>
    api.post(
      `${path(id)}/sources`,
      {
        operationId,
        refs: documents.map((document) => ({
          documentId: document.id,
          versionId: document.versionId,
        })),
      },
      { signal, timeout: 180000 },
    ),
  beginUpload: async (
    id: string,
    file: File,
    mimeType: string,
    operationId: string,
  ): Promise<{ snapshotId: string; presignedUrl?: string; status: string }> =>
    (
      await api.post(`${path(id)}/uploads`, {
        operationId,
        name: file.name,
        mimeType,
        sizeBytes: file.size,
      })
    ).data.data,
  confirmUploads: (id: string, snapshotIds: string[]) =>
    api.post(
      `${path(id)}/uploads/confirm`,
      { snapshotIds },
      { timeout: 180000 },
    ),
  page: async (params: NotebookListParams, signal?: AbortSignal) =>
    notebookPageSchema.parse(
      (
        await api.get("/api/ai/notebooks", {
          params: { ...params, limit: NOTEBOOK_PAGE_SIZE },
          signal,
        })
      ).data,
    ),
  list: async () =>
    notebookListSchema.parse((await api.get("/api/ai/notebooks")).data.data),
  get: async (id: string, signal?: AbortSignal) =>
    notebookSchema.parse((await api.get(path(id), { signal })).data.data),
  create: async (input: NotebookInput): Promise<{ id: string }> =>
    (await api.post("/api/ai/notebooks", input)).data.data,
  update: (id: string, input: NotebookInput) => api.patch(path(id), input),
  remove: (id: string) => api.delete(path(id)),
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
  cancel: (notebookId: string, requestId: string) =>
    api.post(`/api/ai/requests/${requestId}/cancel`, {
      notebookId,
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
