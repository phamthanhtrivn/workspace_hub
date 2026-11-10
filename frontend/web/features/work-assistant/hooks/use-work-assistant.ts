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
import {
  conversationContext,
  conversationContextKey,
} from "../constants/work-assistant";

// Await server cancellation before another context uses the user's active slot.
const cancellations = new Map<string, Promise<void>>();
function cancelStream(userId: string, id: string) {
  const previous = cancellations.get(userId);
  const pending = Promise.allSettled([
    previous,
    workApi.cancelRequest(id),
  ]).then(() => undefined);
  cancellations.set(userId, pending);
  void pending.finally(() => {
    if (cancellations.get(userId) === pending) cancellations.delete(userId);
  });

  return pending;
}
export function workError(error: unknown) {
  return aiErrorMessage(error, "Unable to connect to AI Assistant. Try again.");
}
export function useWorkAssistant(
  userId: string,
  projectId: string | undefined,
  audience: Audience,
  sessionId?: string,
  conversationsOpen = false,
) {
  const client = useQueryClient();
  const accountRoot = useMemo(
    () => ["work-assistant", userId] as const,
    [userId],
  );
  const context = useMemo(
    () => conversationContext(projectId, audience),
    [projectId, audience],
  );
  const root = useMemo(
    () =>
      [...accountRoot, conversationContextKey(projectId, audience)] as const,
    [accountRoot, projectId, audience],
  );
  const historyKey = useMemo(
    () => [...root, "history", sessionId ?? "latest"],
    [root, sessionId],
  );
  const account = useQuery({
    queryKey: [...accountRoot, "account-settings"],
    queryFn: getUserSettings,
    retry: false,
    staleTime: 60000,
  });
  const timeZone = account.data?.data.timezone;
  const history = useInfiniteQuery({
    queryKey: historyKey,
    initialPageParam: undefined as
      { before: string; sessionId: string } | undefined,
    queryFn: ({ pageParam, signal }) =>
      workApi.getSession(
        context,
        pageParam?.before,
        signal,
        pageParam?.sessionId ?? sessionId,
      ),
    getNextPageParam: (page) =>
      page.nextCursor
        ? { before: page.nextCursor, sessionId: page.id }
        : undefined,
    refetchOnMount: "always",
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const conversationsKey = [...root, "sessions"];
  const conversations = useInfiniteQuery({
    queryKey: conversationsKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      workApi.getConversations(context, pageParam, signal),
    enabled: history.isSuccess && conversationsOpen,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchOnMount: "always",
    retry: false,
    gcTime: 0,
  });
  const createConversation = useMutation({
    mutationFn: () => workApi.createConversation(context),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: [...root, "sessions"] }),
  });
  const [pending, setPending] = useState<WorkMessage | null>(null);
  const [reply, setReply] = useState<WorkMessage | null>(null);
  const [streaming, setStreaming] = useState(false);
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
        void cancelStream(userId, request.id);
      }
    };
  }, [userId]);
  const send = useCallback(
    async (question: string) => {
      const session = history.data?.pages[0];
      if (!session || active.current || !question.trim()) return;
      const request = {
        id: crypto.randomUUID(),
        controller: new AbortController(),
      };
      active.current = request;
      const isCurrentRequest = () =>
        alive.current &&
        active.current === request &&
        !request.controller.signal.aborted;
      setPending({
        id: request.id,
        role: "user",
        content: question.trim(),
        sources: [],
        created_at: new Date().toISOString(),
      });
      setReply(null);
      setStreaming(false);
      setError("");
      setNotice("");
      setStatus("Connecting...");
      try {
        await cancellations.get(userId);
        request.controller.signal.throwIfAborted();
        await workApi.sendMessage(
          session.id,
          question.trim(),
          request.id,
          context,
          request.controller.signal,
          (value) => {
            if (isCurrentRequest()) setStatus(assistantStatus(value));
          },
          (message) => {
            if (isCurrentRequest()) {
              setReply(message);
              setStreaming(false);
            }
          },
          timeZone,
          (text) => {
            if (!isCurrentRequest()) return;
            setStreaming(true);
            setReply((current) => ({
              id: `stream-${request.id}`,
              role: "assistant",
              content: (current?.content ?? "") + text,
              sources: [],
              created_at: current?.created_at ?? new Date().toISOString(),
            }));
          },
          () => {
            if (isCurrentRequest()) {
              setReply(null);
              setStreaming(false);
            }
          },
        );
        if (isCurrentRequest()) {
          await Promise.all([
            client.invalidateQueries({ queryKey: historyKey }),
            client.invalidateQueries({ queryKey: [...root, "sessions"] }),
          ]);
          if (alive.current && active.current === request) {
            setPending(null);
            setReply(null);
          }
        }
      } catch (cause) {
        if (alive.current) {
          setReply(null);
          setStreaming(false);
        }
        if (alive.current && !request.controller.signal.aborted)
          setError(workError(cause));
        if (alive.current)
          await client.invalidateQueries({ queryKey: historyKey });
      } finally {
        if (active.current === request) active.current = null;
        if (alive.current) setStatus("");
      }
    },
    [history.data, context, client, historyKey, timeZone, root, userId],
  );
  const stop = async () => {
    const request = active.current;
    if (!request) return;
    request.controller.abort();
    if (alive.current) {
      setReply(null);
      setStreaming(false);
      setNotice("Response stopped.");
    }
    await cancelStream(userId, request.id);
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
    streaming,
    status,
    error,
    notice,
    send,
    stop,
    conversations,
    createConversation,
  };
}
