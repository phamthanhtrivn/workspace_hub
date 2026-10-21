"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { notebooksApi } from "../api/notebooks.api";
import type { Source } from "../types";

export function useNotebook(id: string) {
  const userId = useAppSelector((state) => state.auth.userId);
  const client = useQueryClient();
  const key = ["notebook-ai", userId, id];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => notebooksApi.get(id, signal),
    enabled: Boolean(userId),
    retry: false,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    gcTime: 0,
  });
  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: ["notebook-ai", userId, id] }),
    [client, userId, id],
  );
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => refresh(),
    retry: false,
  });
  return {
    ...query,
    refresh,
    action: mutation.mutateAsync,
    saving: mutation.isPending,
    actionError: mutation.error,
  };
}

export function useNotebookChat(id: string, refresh: () => Promise<unknown>) {
  const active = useRef<{
    controller: AbortController;
    requestId: string;
  } | null>(null);
  const [draft, setDraft] = useState<{
    question: string;
    text: string;
    refs: { id: string; revision: string }[];
  } | null>(null);
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancel = useCallback(() => {
    const request = active.current;
    if (!request) return;
    request.controller.abort();
    active.current = null;
    setBusy(false);
    setDraft(null);
    setError("Đã hủy. Bạn có thể gửi câu hỏi mới.");
    void notebooksApi.cancel(request.requestId).catch(() => {});
  }, []);
  useEffect(
    () => () => {
      const request = active.current;
      request?.controller.abort();
      if (request) void notebooksApi.cancel(request.requestId).catch(() => {});
    },
    [id],
  );
  const ask = async (question: string, sources: Source[]) => {
    if (active.current || !question.trim() || !sources.length) return;
    const request = {
      controller: new AbortController(),
      requestId: crypto.randomUUID(),
    };
    active.current = request;
    setBusy(true);
    setError("");
    setStage("Đang tìm đoạn tài liệu liên quan…");
    setDraft({
      question,
      text: "",
      refs: sources.map((s) => ({ id: s.id, revision: s.revision })),
    });
    const timeout = setTimeout(() => request.controller.abort(), 75000);
    try {
      await notebooksApi.answer(
        id,
        question,
        sources.map((s) => s.id),
        request.requestId,
        request.controller.signal,
        (event) => {
          if (active.current !== request) return;
          if (event.event === "status" && event.data.stage === "GENERATING")
            setStage("AI đang tạo câu trả lời…");
          if (event.event === "delta")
            setDraft((current) =>
              current
                ? { ...current, text: current.text + (event.data.text || "") }
                : null,
            );
        },
      );
      if (active.current === request) {
        await refresh();
        setDraft(null);
      }
    } catch (cause) {
      if (active.current === request) {
        setDraft(null);
        setError(
          request.controller.signal.aborted
            ? "Đã hết thời gian chờ; yêu cầu không tự gửi lại."
            : (cause as Error).message,
        );
      }
    } finally {
      clearTimeout(timeout);
      if (active.current === request) {
        active.current = null;
        setBusy(false);
        void refresh();
      }
    }
  };
  return { ask, cancel, busy, draft, stage, error };
}
