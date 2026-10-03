"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AmbientTrackId } from "../types/ambient";
import type { PomodoroStatus } from "../types/pomodoro";
import { ambientAudio } from "../utils/ambient-audio";
import {
  deleteCustomAudioTrack,
  loadCustomAudioTracks,
  saveCustomAudioTrack,
  type CustomTrackRecord,
} from "../utils/audio-storage";

export function usePomodoroAmbient(status: PomodoroStatus, userId: string) {
  const [ambientTrack, setAmbientTrack] = useState<AmbientTrackId>("lofi_relax");
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [autoPlayAmbient, setAutoPlayAmbient] = useState(true);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [customTracks, setCustomTracks] = useState<CustomTrackRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    ambientAudio.setTrack("lofi_relax");
    ambientAudio.setVolume(0.5);
    ambientAudio.setPlaybackListener(setIsAmbientPlaying);
    void loadCustomAudioTracks(userId)
      .then((tracks) => {
        if (mounted) setCustomTracks(tracks);
      })
      .catch(() => {
        if (mounted) toast.error("Unable to load your uploaded audio.");
      });

    return () => {
      mounted = false;
      ambientAudio.setPlaybackListener(null);
      ambientAudio.pause();
    };
  }, [userId]);

  const playAmbient = useCallback(() => ambientAudio.play(), []);
  const pauseAmbient = useCallback(() => {
    ambientAudio.pause();
    setIsAmbientPlaying(false);
  }, []);

  const selectAmbientTrack = useCallback(
    (trackId: AmbientTrackId, explicitUrl?: string) => {
      setAmbientTrack(trackId);
      let urlToUse = explicitUrl;
      if (!urlToUse && trackId.startsWith("custom_")) {
        urlToUse = customTracks.find((track) => track.id === trackId)?.url;
      }
      ambientAudio.setTrack(trackId, urlToUse);

      if (trackId === "none") {
        ambientAudio.stop();
        setIsAmbientPlaying(false);
      } else if (status === "RUNNING" || isAmbientPlaying) {
        ambientAudio.play();
      }
    },
    [customTracks, isAmbientPlaying, status],
  );

  const toggleAmbientPlay = useCallback(() => {
    if (isAmbientPlaying) pauseAmbient();
    else playAmbient();
  }, [isAmbientPlaying, pauseAmbient, playAmbient]);

  const changeAmbientVolume = useCallback((volume: number) => {
    setAmbientVolume(volume);
    ambientAudio.setVolume(volume);
  }, []);

  const toggleAutoPlayAmbient = useCallback((enabled: boolean) => {
    setAutoPlayAmbient(enabled);
  }, []);

  const uploadCustomTrack = useCallback(async (file: File) => {
    const saved = await saveCustomAudioTrack(userId, file);
    setCustomTracks((current) => [saved, ...current]);
    selectAmbientTrack(saved.id, saved.url);
    return saved;
  }, [selectAmbientTrack, userId]);

  const removeCustomTrack = useCallback(async (id: string) => {
    await deleteCustomAudioTrack(userId, id);
    setCustomTracks((current) => current.filter((track) => track.id !== id));
    if (ambientTrack === id) selectAmbientTrack("none");
  }, [ambientTrack, selectAmbientTrack, userId]);

  return {
    ambientTrack,
    ambientVolume,
    autoPlayAmbient,
    isAmbientPlaying,
    customTracks,
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
