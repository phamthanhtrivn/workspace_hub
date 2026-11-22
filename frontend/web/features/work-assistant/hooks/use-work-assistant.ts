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
import {
  WORK_ASSISTANT_READ_POLICY,
  WORK_ASSISTANT_QUERY_ROOT,
} from "../constants/work-assistant-query";
import { verifyWorkCacheAccess, workAccessDenied } from "../api/cache-access";
import { cancelStream, confirmCancellation } from "../api/cancellation";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import type { Audience, WorkMessage } from "../types";
import {
  conversationContext,
  conversationContextKey,
} from "../constants/work-assistant";

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
    () => [...WORK_ASSISTANT_QUERY_ROOT, userId] as const,
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
  const accessKey = [...root, "cache-access"];
  const access = useQuery({
    ...WORK_ASSISTANT_READ_POLICY,
    queryKey: accessKey,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: false,
    queryFn: ({ signal }) =>
      verifyWorkCacheAccess(client, root, () =>
        workApi.getCacheAccess(context, signal),
      ),
  });
  const accessReady = access.isSuccess && !access.isFetching;
  const timeZone = useAccountTimezone();
  const history = useInfiniteQuery({
    ...WORK_ASSISTANT_READ_POLICY,
    queryKey: historyKey,
    enabled: accessReady,
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
  });
  const conversationsKey = [...root, "sessions"];
  useEffect(() => {
    if (workAccessDenied(history.error))
      void client.resetQueries({ queryKey: root });
  }, [history.error, client, root]);
  const conversations = useInfiniteQuery({
    ...WORK_ASSISTANT_READ_POLICY,
    queryKey: conversationsKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      workApi.getConversations(context, pageParam, signal),
    enabled: accessReady && history.isSuccess && conversationsOpen,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const createConversation = useMutation({
    mutationFn: () => workApi.createConversation(context),
    onSuccess: async (session) => {
      const cached = { pages: [session], pageParams: [undefined] };
      client.setQueryData([...root, "history", "latest"], cached);
      client.setQueryData([...root, "history", session.id], cached);
      await client.invalidateQueries({ queryKey: [...root, "sessions"] });
    },
  });
  const [pending, setPending] = useState<WorkMessage | null>(null);
  const [reply, setReply] = useState<WorkMessage | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stopping, setStopping] = useState(false);
  const active = useRef<{
    id: string;
    sessionId: string;
    controller: AbortController;
    permissionStamp?: string;
  } | null>(null);
  const alive = useRef(true);
  const retryRequest = useRef<{
    id: string;
    sessionId: string;
    question: string;
  } | null>(null);
  const retrying = useRef(false);
  const permissionStamp = access.data?.permissionStamp;
  useEffect(() => {
    const request = active.current;
    if (!request) return;
    const accessChanged =
      access.isSuccess &&
      !access.isFetching &&
      request.permissionStamp !== undefined &&
      permissionStamp !== request.permissionStamp;
    if (!accessChanged && !workAccessDenied(access.error)) return;
    request.controller.abort();
    setReply(null);
    setPending(null);
    void cancelStream(userId, request.id, request.sessionId).catch(() => {});
  }, [
    access.isSuccess,
    access.isFetching,
    access.error,
    permissionStamp,
    userId,
  ]);
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      const request = active.current;
      if (request) {
        request.controller.abort();
        void cancelStream(userId, request.id, request.sessionId).catch(
          () => {},
        );
      }
    };
  }, [userId]);
  const send = useCallback(
    async (question: string, reuseRequestId?: string, reconciled = false) => {
      const session = history.data?.pages[0];
      if (
        !accessReady ||
        !session ||
        active.current ||
        (retrying.current && !reconciled) ||
        !question.trim()
      )
        return;
      const request = {
        id: reuseRequestId ?? crypto.randomUUID(),
        sessionId: session.id,
        controller: new AbortController(),
        permissionStamp,
      };
      active.current = request;
      retryRequest.current = {
        id: request.id,
        sessionId: session.id,
        question: question.trim(),
      };
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
        await confirmCancellation(userId);
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
            const refreshed = client.getQueryData(historyKey);
            if (refreshed)
              client.setQueryData([...root, "history", "latest"], refreshed);
            setPending(null);
            setReply(null);
            retryRequest.current = null;
          }
        }
      } catch (cause) {
        if (workAccessDenied(cause))
          void client.resetQueries({ queryKey: root });
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
    [
      history.data,
      context,
      client,
      historyKey,
      timeZone,
      root,
      userId,
      accessReady,
      permissionStamp,
    ],
  );
  const retry = async () => {
    if (retrying.current || active.current || !accessReady) return;
    const previous = retryRequest.current;
    if (!previous) return;
    retrying.current = true;
    setStatus("Checking previous response...");
    try {
      const state = await workApi.getRequestStatus(
        previous.sessionId,
        previous.id,
        context,
      );
      if (!alive.current) return;
      if (state === "COMPLETED") {
        await client.invalidateQueries({ queryKey: historyKey });
        if (!alive.current) return;
        const refreshed = client.getQueryData(historyKey);
        if (refreshed)
          client.setQueryData([...root, "history", "latest"], refreshed);
        retryRequest.current = null;
        setPending(null);
        setError("");
      } else if (state === "RUNNING") {
        setError(
          "Your previous question is still processing. Check again before sending another request.",
        );
      } else {
        await send(
          previous.question,
          state === "NOT_FOUND" ? previous.id : undefined,
          true,
        );
      }
    } catch (cause) {
      if (workAccessDenied(cause)) void client.resetQueries({ queryKey: root });
      if (alive.current) setError(workError(cause));
    } finally {
      retrying.current = false;
      if (alive.current) setStatus("");
    }
  };
  const stop = async () => {
    const request = active.current;
    if (!request) return;
    setStopping(true);
    request.controller.abort();
    if (alive.current) {
      setReply(null);
      setStreaming(false);
      setNotice("");
    }
    try {
      await cancelStream(userId, request.id, request.sessionId);
      if (alive.current) setNotice("Response stopped.");
    } catch {
      if (alive.current)
        setError(
          "Unable to confirm cancellation. Retry before asking another question.",
        );
    } finally {
      if (alive.current) setStopping(false);
    }
  };
  const messages =
    (accessReady && history.isSuccess ? history.data : undefined)?.pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages) ?? [];

  return {
    history: accessReady
      ? history
      : {
          ...history,
          data: undefined,
          isSuccess: false,
          isPending: access.isPending,
          isFetching: access.isFetching,
          hasNextPage: false,
          isError: access.isError,
          error: access.error,
          refetch: access.refetch,
        },
    messages,
    pending: accessReady ? pending : null,
    reply: accessReady ? reply : null,
    streaming,
    status: stopping ? "Stopping response..." : status,
    error,
    notice,
    send,
    retry,
    stop,
    conversations:
      accessReady && history.isSuccess
        ? conversations
        : { ...conversations, data: undefined, hasNextPage: false },
    createConversation,
  };
}
