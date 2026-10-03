"use client";

import { useCallback, useEffect, useState } from "react";
import { EMPTY_POMODORO_AUDIOS, type AmbientTrackId } from "../types/ambient";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";
import { ambientAudio } from "../utils/ambient-audio";
import { usePomodoroAmbientPreferences } from "./use-pomodoro-ambient-preferences";
import { usePomodoroAudios } from "./use-pomodoro-audios";
import { AMBIENT_VOLUME_SAVE_DELAY_MS } from "../types/pomodoro-preferences";

export function usePomodoroAmbient(status: PomodoroStatus, mode: PomodoroMode, userId: string) {
  const library = usePomodoroAudios(userId);
  const { refetch } = library;
  const { preferences, isReady, syncStatus, updatePreferences } = usePomodoroAmbientPreferences(userId, library.data);
  const audios = library.data ?? EMPTY_POMODORO_AUDIOS;
  const { trackId: ambientTrack, volume: ambientVolume, autoPlayOnFocus: autoPlayAmbient } = preferences;
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const selectedAudioUrl = audios.find((audio) => audio.id === ambientTrack)?.url;
  const isTrackUnavailable = !library.isPending && ambientTrack !== "none" && !selectedAudioUrl;
  // A failed library must still allow retrying or choosing audio off.
  const isAmbientReady = isReady;

  useEffect(() => {
    ambientAudio.setTrack("none");
    ambientAudio.setPlaybackListener(setIsAmbientPlaying);
    ambientAudio.setErrorListener(() => setHasPlaybackError(true));
    return () => {
      ambientAudio.setPlaybackListener(null);
      ambientAudio.setErrorListener(null);
      ambientAudio.setTrack("none");
      ambientAudio.stop();
    };
  }, [userId]);

  // Hydration only configures the player. It never starts playback.
  useEffect(() => {
    if (!isAmbientReady) return;
    ambientAudio.setTrack(selectedAudioUrl ? ambientTrack : "none", selectedAudioUrl);
    ambientAudio.setVolume(ambientVolume);
  }, [ambientTrack, ambientVolume, selectedAudioUrl, isAmbientReady]);

  const playAmbient = useCallback(() => {
    if (!isAmbientReady || !selectedAudioUrl) return;
    setHasPlaybackError(false);
    return ambientAudio.play();
  }, [isAmbientReady, selectedAudioUrl]);

  const pauseAmbient = useCallback(() => ambientAudio.pause(), []);

  const selectAmbientTrack = useCallback((trackId: AmbientTrackId) => {
    const url = audios.find((audio) => audio.id === trackId)?.url;
    if (trackId !== "none" && !url) return;
    updatePreferences({ trackId });
    setHasPlaybackError(false);
    ambientAudio.setTrack(trackId, url);
    if (trackId !== "none" && (isAmbientPlaying || (status === "RUNNING" && mode === "FOCUS" && autoPlayAmbient))) {
      void ambientAudio.play();
    }
  }, [audios, isAmbientPlaying, status, mode, autoPlayAmbient, updatePreferences]);

  const toggleAmbientPlay = useCallback(() => {
    if (isAmbientPlaying) pauseAmbient();
    else void playAmbient();
  }, [isAmbientPlaying, pauseAmbient, playAmbient]);

  const changeAmbientVolume = useCallback((volume: number) => {
    const boundedVolume = Math.max(0, Math.min(1, volume));
    updatePreferences({ volume: boundedVolume }, AMBIENT_VOLUME_SAVE_DELAY_MS);
    ambientAudio.setVolume(boundedVolume);
  }, [updatePreferences]);

  const toggleAutoPlayAmbient = useCallback((enabled: boolean) => {
    updatePreferences({ autoPlayOnFocus: enabled });
  }, [updatePreferences]);

  const retryAudioLibrary = useCallback(() => { void refetch(); }, [refetch]);

  return {
    ambientTrack, ambientVolume, autoPlayAmbient, isAmbientPlaying,
    audios, isAudioLibraryLoading: library.isPending, hasAudioLibraryError: library.isError,
    retryAudioLibrary, hasPlaybackError, isAmbientReady, isTrackUnavailable,
    ambientSyncStatus: syncStatus, playAmbient, pauseAmbient, selectAmbientTrack,
    toggleAmbientPlay, changeAmbientVolume, toggleAutoPlayAmbient,
  };
}
