"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPomodoroAmbientPreferences, savePomodoroAmbientPreferences } from "../api/pomodoro-ambient-preferences.api";
import { DEFAULT_AMBIENT_PREFERENCES, normalizeAmbientPreferences, reconcileAmbientPreferences, type PomodoroAmbientPreferences, type PomodoroAudio } from "../types/ambient";
import { AMBIENT_PREFERENCES_RETRY_INTERVAL_MS } from "../types/pomodoro-preferences";
import { loadLocalAmbientPreferences, loadPendingAmbientPreferences, saveLocalAmbientPreferences } from "../utils/pomodoro-local-storage";
import { createAmbientPreferencesSync } from "../utils/ambient-preferences-sync";

const ambientPreferencesKey = (userId: string) => ["pomodoro", "ambient-preferences", userId] as const;

export function usePomodoroAmbientPreferences(userId: string, audios: readonly PomodoroAudio[] | undefined) {
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: ({ preferences, signal }: { preferences: PomodoroAmbientPreferences; signal: AbortSignal }) =>
      savePomodoroAmbientPreferences(reconcileAmbientPreferences(preferences, audios), signal),
    retry: false,
  });
  const sync = useMemo(() => createAmbientPreferencesSync((preferences, signal) =>
    mutateAsync({ preferences: reconcileAmbientPreferences(preferences, audios), signal }),
    (saved) => saveLocalAmbientPreferences(userId, saved)), [mutateAsync, userId, audios]);
  const syncStatus = useSyncExternalStore(sync.subscribe, sync.getStatus, () => "idle");
  const query = useQuery({
    queryKey: ambientPreferencesKey(userId),
    queryFn: async ({ signal }) => {
      const revision = sync.getRevision();
      const remote = normalizeAmbientPreferences(await getPomodoroAmbientPreferences(signal));
      // An older GET must not replace a choice made while it was in flight,
      // even if the corresponding PUT has already cleared local pending data.
      if (sync.getRevision() !== revision) {
        return queryClient.getQueryData<PomodoroAmbientPreferences>(ambientPreferencesKey(userId)) ?? remote;
      }
      const pending = loadPendingAmbientPreferences(userId);
      if (!pending) saveLocalAmbientPreferences(userId, remote);
      return pending ?? remote;
    },
    enabled: Boolean(userId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    sync.start();
    const pending = loadPendingAmbientPreferences(userId);
    const stored = pending ?? loadLocalAmbientPreferences(userId);
    const cached = stored ? reconcileAmbientPreferences(stored, audios) : null;
    if (cached) queryClient.setQueryData(ambientPreferencesKey(userId), cached);
    if (pending && cached) {
      saveLocalAmbientPreferences(userId, cached, true);
      // Wait for the catalog before retrying IDs from a previous library.
      if (audios || cached.trackId === "none") sync.schedule(cached);
    }
    const retry = () => sync.retry();
    const interval = setInterval(retry, AMBIENT_PREFERENCES_RETRY_INTERVAL_MS);
    window.addEventListener("online", retry);
    return () => {
      sync.stop();
      clearInterval(interval);
      window.removeEventListener("online", retry);
    };
  }, [queryClient, sync, userId, audios]);

  useEffect(() => {
    if (!audios || !query.data) return;
    const reconciled = reconcileAmbientPreferences(query.data, audios);
    if (reconciled === query.data) return;
    saveLocalAmbientPreferences(userId, reconciled, true);
    queryClient.setQueryData(ambientPreferencesKey(userId), reconciled);
    sync.schedule(reconciled);
  }, [audios, query.data, queryClient, sync, userId]);

  const updatePreferences = useCallback((patch: Partial<PomodoroAmbientPreferences>, delay = 0) => {
    const current = queryClient.getQueryData<PomodoroAmbientPreferences>(ambientPreferencesKey(userId)) ?? DEFAULT_AMBIENT_PREFERENCES;
    const next = reconcileAmbientPreferences({ ...current, ...patch }, audios);
    saveLocalAmbientPreferences(userId, next, true);
    queryClient.setQueryData(ambientPreferencesKey(userId), next);
    if (audios || next.trackId === "none") sync.schedule(next, delay);
  }, [queryClient, sync, userId, audios]);

  return {
    preferences: normalizeAmbientPreferences(query.data ?? DEFAULT_AMBIENT_PREFERENCES),
    isReady: !query.isPending,
    syncStatus: syncStatus === "idle" && query.isError ? "error" : syncStatus,
    updatePreferences,
  };
}
