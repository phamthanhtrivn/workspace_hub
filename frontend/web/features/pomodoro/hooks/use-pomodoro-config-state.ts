"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_POMODORO_CONFIG, getPomodoroConfig, savePomodoroConfig } from "../api/pomodoro-server.api";
import { POMODORO_CONFIG_RETRY_INTERVAL_MS, POMODORO_CONFIG_STALE_TIME_MS } from "../constants/pomodoro-settings";
import type { PomodoroConfig } from "../types/pomodoro";
import { loadLocalPomodoroConfig, loadPendingPomodoroConfig, saveLocalPomodoroConfig } from "../utils/pomodoro-local-storage";
import { toPomodoroConfig } from "../utils/pomodoro-config";
import { createPomodoroConfigSync, type PomodoroConfigSyncStatus } from "../utils/pomodoro-config-sync";

export function usePomodoroConfigState(userId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["pomodoro", "config", userId] as const, [userId]);
  const { mutateAsync } = useMutation({
    mutationFn: ({ config, signal }: { config: PomodoroConfig; signal: AbortSignal }) => savePomodoroConfig(config, signal),
    retry: false,
  });
  const sync = useMemo(() => createPomodoroConfigSync(
    (config, signal) => mutateAsync({ config, signal }),
    (saved) => {
      if (!userId) return;
      saveLocalPomodoroConfig(userId, saved);
      // A newer queued choice must stay visible while an older write finishes.
      queryClient.setQueryData<PomodoroConfig>(queryKey, (current) => current ?? saved);
    },
  ), [mutateAsync, queryClient, queryKey, userId]);
  const syncStatus = useSyncExternalStore<PomodoroConfigSyncStatus>(sync.subscribe, sync.getStatus, () => "idle");

  const loadServerConfig = useCallback(async (signal: AbortSignal) => {
    const revision = sync.getRevision();
    const remote = await getPomodoroConfig(signal);
    if (sync.getRevision() !== revision) {
      return queryClient.getQueryData<PomodoroConfig>(queryKey) ?? remote;
    }
    const pending = userId ? loadPendingPomodoroConfig(userId) : null;
    if (userId && !pending) saveLocalPomodoroConfig(userId, remote);
    return pending ? toPomodoroConfig(pending) : remote;
  }, [queryClient, queryKey, sync, userId]);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => loadServerConfig(signal),
    enabled: Boolean(userId),
    staleTime: POMODORO_CONFIG_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const ensureConfigLoaded = useCallback(async () => {
    if (!userId) return DEFAULT_POMODORO_CONFIG;
    try {
      return await queryClient.fetchQuery({ queryKey, queryFn: ({ signal }) => loadServerConfig(signal), staleTime: POMODORO_CONFIG_STALE_TIME_MS });
    } catch {
      return toPomodoroConfig(loadPendingPomodoroConfig(userId) ?? loadLocalPomodoroConfig(userId) ?? DEFAULT_POMODORO_CONFIG);
    }
  }, [loadServerConfig, queryClient, queryKey, userId]);

  useEffect(() => {
    if (!userId) return;
    sync.start();
    const pending = loadPendingPomodoroConfig(userId);
    const cached = pending ?? loadLocalPomodoroConfig(userId);
    if (cached) queryClient.setQueryData(queryKey, toPomodoroConfig(cached));
    if (pending) {
      const normalized = toPomodoroConfig(pending);
      saveLocalPomodoroConfig(userId, normalized, true);
      void sync.submit(normalized).catch(() => {});
    }
    const retry = () => {
      sync.retry();
      if (sync.getStatus() === "idle" && queryClient.getQueryState(queryKey)?.status === "error") {
        void queryClient.fetchQuery({ queryKey, queryFn: ({ signal }) => loadServerConfig(signal) }).catch(() => {});
      }
    };
    const interval = setInterval(retry, POMODORO_CONFIG_RETRY_INTERVAL_MS);
    window.addEventListener("online", retry);
    return () => {
      sync.stop();
      clearInterval(interval);
      window.removeEventListener("online", retry);
    };
  }, [loadServerConfig, queryClient, queryKey, sync, userId]);

  const saveConfig = useCallback((next: PomodoroConfig) => {
    if (!userId) return Promise.reject(new Error("Sign in to save Pomodoro settings"));
    const config = toPomodoroConfig(next);
    saveLocalPomodoroConfig(userId, config, true);
    queryClient.setQueryData(queryKey, config);
    return sync.submit(config);
  }, [queryClient, queryKey, sync, userId]);

  return {
    config: query.data ?? DEFAULT_POMODORO_CONFIG,
    isReady: Boolean(userId) && !query.isPending,
    loadError: query.isError || syncStatus === "error",
    syncStatus,
    saveConfig,
    ensureConfigLoaded,
  };
}
