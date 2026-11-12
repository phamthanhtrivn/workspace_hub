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
    stopped: boolean;
    canceling: boolean;
  } | null>(null);
  const [draft, setDraft] = useState<{
    question: string;
    text: string;
    refs: { id: string; revision: string }[];
  } | null>(null);
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryQuestion, setRetryQuestion] = useState("");
  const cancel = useCallback(() => {
    const request = active.current;
    if (!request || request.canceling) return;
    request.stopped = true;
    request.canceling = true;
    request.controller.abort();
    setDraft(null);
    setStage("Stopping response...");
    setError("");
    void notebooksApi.cancel(request.requestId).then(
      () => {
        if (active.current !== request) return;
        active.current = null;
        setBusy(false);
        setStage("");
        setError("Response stopped. You can ask another question.");
      },
      () => {
        request.canceling = false;
        if (active.current === request)
          setError(
            "Unable to confirm cancellation. Press Stop response to try again.",
          );
      },
    );
  }, []);
  useEffect(
    () => () => {
      const request = active.current;
      active.current = null;
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
      stopped: false,
      canceling: false,
    };
    active.current = request;
    setBusy(true);
    setError("");
    setRetryQuestion("");
    setStage("Finding relevant passages...");
    setDraft({
      question,
      text: "",
      refs: sources.map((s) => ({ id: s.id, revision: s.revision })),
    });
    const timeout = setTimeout(() => request.controller.abort(), 150000);
    try {
      await notebooksApi.answer(
        id,
        question,
        sources.map((s) => s.id),
        request.requestId,
        request.controller.signal,
        (event) => {
          if (active.current !== request || request.stopped) return;
          if (event.event === "status" && event.data.stage === "GENERATING")
            setStage("Writing your answer...");
          if (event.event === "delta")
            setDraft((current) =>
              current
                ? { ...current, text: current.text + (event.data.text || "") }
                : null,
            );
        },
      );
      if (active.current === request && !request.stopped) {
        try {
          await refresh();
          if (active.current === request && !request.stopped) setDraft(null);
        } catch {
          if (active.current === request && !request.stopped)
            setError(
              "The answer was saved, but the notebook could not refresh. Reload the notebook to view it.",
            );
        }
      }
    } catch (cause) {
      if (active.current === request && !request.stopped) {
        setRetryQuestion(question);
        setDraft((current) => (current?.text ? current : null));
        setError(
          request.controller.signal.aborted
            ? "The request timed out. It was not resent."
            : (cause as Error).message,
        );
      }
    } finally {
      clearTimeout(timeout);
      if (active.current === request && !request.stopped) {
        active.current = null;
        setBusy(false);
        void refresh().catch(() => {});
      }
    }
  };

  return { ask, cancel, busy, draft, stage, error, retryQuestion };
}
