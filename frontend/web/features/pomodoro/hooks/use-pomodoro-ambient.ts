"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AmbientTrackId } from "../types/ambient";
import type { PomodoroStatus } from "../types/pomodoro";
import { ambientAudio } from "../utils/ambient-audio";
import { usePomodoroAmbientPreferences } from "./use-pomodoro-ambient-preferences";
import { AMBIENT_VOLUME_SAVE_DELAY_MS } from "../types/pomodoro-preferences";
import {
  deleteCustomAudioTrack,
  loadCustomAudioTracks,
  saveCustomAudioTrack,
  type CustomTrackRecord,
} from "../utils/audio-storage";

export function usePomodoroAmbient(status: PomodoroStatus, userId: string) {
  const { preferences, isReady, syncStatus, updatePreferences } = usePomodoroAmbientPreferences(userId);
  const { trackId: ambientTrack, volume: ambientVolume, autoPlayOnFocus: autoPlayAmbient } = preferences;
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [customTracks, setCustomTracks] = useState<CustomTrackRecord[]>([]);
  const [customTracksReady, setCustomTracksReady] = useState(false);
  const mountedRef = useRef(false);
  const customUrlsRef = useRef(new Set<string>());
  const customTrackUrl = customTracks.find((track) => track.id === ambientTrack)?.url;
  const isCustomTrack = ambientTrack.startsWith("custom_");
  const isTrackUnavailable = isCustomTrack && customTracksReady && !customTrackUrl;
  const isAmbientReady = isReady && (!isCustomTrack || customTracksReady);

  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;
    ambientAudio.stop();
    ambientAudio.setTrack("none");
    ambientAudio.setPlaybackListener(setIsAmbientPlaying);
    void loadCustomAudioTracks(userId)
      .then((tracks) => {
        if (mounted) {
          tracks.forEach((track) => customUrlsRef.current.add(track.url));
          setCustomTracks(tracks);
          setCustomTracksReady(true);
        } else {
          tracks.forEach((track) => URL.revokeObjectURL(track.url));
        }
      })
      .catch(() => {
        if (mounted) { setCustomTracksReady(true); toast.error("Unable to load your uploaded audio."); }
      });

    return () => {
      mounted = false;
      mountedRef.current = false;
      ambientAudio.setPlaybackListener(null);
      ambientAudio.pause();
      customUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      customUrlsRef.current.clear();
    };
  }, [userId]);

  // Hydration only configures the player. It never starts playback.
  useEffect(() => {
    if (!isAmbientReady) return;
    ambientAudio.setTrack(isTrackUnavailable ? "none" : ambientTrack, customTrackUrl);
    ambientAudio.setVolume(ambientVolume);
  }, [ambientTrack, ambientVolume, customTrackUrl, isAmbientReady, isTrackUnavailable]);

  const playAmbient = useCallback(() => {
    if (isAmbientReady && !isTrackUnavailable) return ambientAudio.play();
  }, [isAmbientReady, isTrackUnavailable]);
  const pauseAmbient = useCallback(() => {
    ambientAudio.pause();
    setIsAmbientPlaying(false);
  }, []);

  const selectAmbientTrack = useCallback(
    (trackId: AmbientTrackId, explicitUrl?: string) => {
      updatePreferences({ trackId });
      let urlToUse = explicitUrl;
      if (!urlToUse && trackId.startsWith("custom_")) {
        urlToUse = customTracks.find((track) => track.id === trackId)?.url;
      }
      const unavailable = trackId.startsWith("custom_") && !urlToUse;
      ambientAudio.setTrack(unavailable ? "none" : trackId, urlToUse);

      if (trackId === "none" || unavailable) {
        ambientAudio.stop();
        setIsAmbientPlaying(false);
      } else if (status === "RUNNING" || isAmbientPlaying) {
        ambientAudio.play();
      }
    },
    [customTracks, isAmbientPlaying, status, updatePreferences],
  );

  const toggleAmbientPlay = useCallback(() => {
    if (isAmbientPlaying) pauseAmbient();
    else playAmbient();
  }, [isAmbientPlaying, pauseAmbient, playAmbient]);

  const changeAmbientVolume = useCallback((volume: number) => {
    const boundedVolume = Math.max(0, Math.min(1, volume));
    updatePreferences({ volume: boundedVolume }, AMBIENT_VOLUME_SAVE_DELAY_MS);
    ambientAudio.setVolume(boundedVolume);
  }, [updatePreferences]);

  const toggleAutoPlayAmbient = useCallback((enabled: boolean) => {
    updatePreferences({ autoPlayOnFocus: enabled });
  }, [updatePreferences]);

  const uploadCustomTrack = useCallback(async (file: File) => {
    const saved = await saveCustomAudioTrack(userId, file);
    if (!mountedRef.current) {
      URL.revokeObjectURL(saved.url);
      return saved;
    }
    customUrlsRef.current.add(saved.url);
    setCustomTracks((current) => [saved, ...current]);
    selectAmbientTrack(saved.id, saved.url);
    return saved;
  }, [selectAmbientTrack, userId]);

  const removeCustomTrack = useCallback(async (id: string) => {
    await deleteCustomAudioTrack(userId, id);
    if (!mountedRef.current) return;
    setCustomTracks((current) => current.filter((track) => track.id !== id));
    if (ambientTrack === id) selectAmbientTrack("none");
    const trackUrl = customTracks.find((track) => track.id === id)?.url;
    if (trackUrl) { URL.revokeObjectURL(trackUrl); customUrlsRef.current.delete(trackUrl); }
  }, [ambientTrack, customTracks, selectAmbientTrack, userId]);

  return {
    ambientTrack,
    ambientVolume,
    autoPlayAmbient,
    isAmbientPlaying,
    customTracks,
    isAmbientReady,
    isTrackUnavailable,
    ambientSyncStatus: syncStatus,
    playAmbient,
    pauseAmbient,
    selectAmbientTrack,
    toggleAmbientPlay,
    changeAmbientVolume,
    toggleAutoPlayAmbient,
    uploadCustomTrack,
    removeCustomTrack,
  };
}
