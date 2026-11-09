"use client";
import { aiErrorMessage, assistantStatus } from "@/lib/ai-feedback";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as workApi from "../api/work-assistant.api";
import { getUserSettings } from "@/features/user-setting/api/user-setting.api";
import type { Audience, WorkMessage } from "../types";
export function workError(error: unknown) {
  return aiErrorMessage(error, "Unable to connect to AI Assistant. Try again.");
}
export function useWorkAssistant(
  userId: string,
  projectId: string | undefined,
  audience: Audience,
  sessionId?: string,
) {
  const client = useQueryClient();
  const root = useMemo(() => ["work-assistant", userId] as const, [userId]);
  const historyKey = useMemo(
    () => [...root, "history", projectId ?? "personal", sessionId ?? "latest"],
    [root, projectId, sessionId],
  );
  const account = useQuery({
    queryKey: [...root, "account-settings"],
    queryFn: getUserSettings,
    retry: false,
    staleTime: 60000,
  });
  const timeZone = account.data?.data.timezone;
  const history = useInfiniteQuery({
    queryKey: historyKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      workApi.getSession(projectId, pageParam, signal, sessionId),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchOnMount: "always",
    retry: false,
    staleTime: 0,
  });
  const conversationsKey = [...root, "sessions", projectId ?? "personal"];
  const conversations = useInfiniteQuery({
    queryKey: conversationsKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      workApi.getConversations(projectId, pageParam, signal),
    enabled: history.isSuccess,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchOnMount: "always",
    retry: false,
  });
  const createConversation = useMutation({
    mutationFn: () => workApi.createConversation(projectId),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: [...root, "sessions"] }),
  });
  const [pending, setPending] = useState<WorkMessage | null>(null);
  const [reply, setReply] = useState<WorkMessage | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef<{ id: string; controller: AbortController } | null>(
    null,
  );
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      const request = active.current;
      if (request) {
        request.controller.abort();
        void workApi.cancelRequest(request.id).catch(() => undefined);
      }
    };
  }, []);
  const send = useCallback(
    async (question: string) => {
      const session = history.data?.pages[0];
      if (!session || active.current || !question.trim()) return;
      const request = {
        id: crypto.randomUUID(),
        controller: new AbortController(),
      };
      active.current = request;
      setPending({
        id: request.id,
        role: "user",
        content: question.trim(),
        sources: [],
        created_at: new Date().toISOString(),
      });
      setReply(null);
      setError("");
      setNotice("");
      setStatus("Connecting...");
      try {
        await workApi.sendMessage(
          session.id,
          question.trim(),
          request.id,
          audience,
          request.controller.signal,
          (value) => {
            if (alive.current) setStatus(assistantStatus(value));
          },
          (message) => {
            if (alive.current) setReply(message);
          },
          timeZone,
        );
        if (alive.current) {
          await client.invalidateQueries({ queryKey: historyKey });
          await client.invalidateQueries({ queryKey: [...root, "sessions"] });
          setPending(null);
          setReply(null);
        }
      } catch (cause) {
        if (alive.current && !request.controller.signal.aborted)
          setError(workError(cause));
        if (alive.current)
          await client.invalidateQueries({ queryKey: historyKey });
      } finally {
        if (active.current === request) active.current = null;
        if (alive.current) setStatus("");
      }
    },
    [history.data, audience, client, historyKey, timeZone, root],
  );
  const stop = async () => {
    const request = active.current;
    if (!request) return;
    try {
      await workApi.cancelRequest(request.id);
    } catch {
      /* Closing the stream also cancels the server request. */
    }
    request.controller.abort();
    if (alive.current) {
      setStatus("Stopping...");
      setNotice("Response stopped.");
    }
  };
  const messages =
    history.data?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages) ?? [];

  return {
    history,
    messages,
    pending,
    reply,
    status,
    error,
    notice,
    send,
    stop,
    conversations,
    createConversation,
  };
}
