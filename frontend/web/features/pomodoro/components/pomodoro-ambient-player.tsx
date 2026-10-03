"use client";

import React, { useState } from "react";
import { Volume2, VolumeX, Play, Pause, ChevronDown, Sliders, Sparkles } from "lucide-react";
import { AUDIO_OFF_TRACK, type AmbientTrackId, type PomodoroAudio } from "../types/ambient";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";
import { PomodoroAudioIcon } from "./pomodoro-audio-icon";
import { PomodoroAudioTrackList } from "./pomodoro-audio-track-list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PomodoroAmbientPlayerProps {
  currentTrackId: AmbientTrackId;
  isPlaying: boolean;
  volume: number;
  autoPlayOnFocus: boolean;
  audios: PomodoroAudio[];
  isLibraryLoading: boolean;
  hasLibraryError: boolean;
  onRetryLibrary: () => void;
  disabled?: boolean;
  isTrackUnavailable?: boolean;
  onSelectTrack: (trackId: AmbientTrackId) => void;
  onTogglePlay: () => void;
  onChangeVolume: (volume: number) => void;
  onToggleAutoPlay: (enabled: boolean) => void;
}

export const PomodoroAmbientPlayer = React.memo(function PomodoroAmbientPlayer({
  currentTrackId, isPlaying, volume, autoPlayOnFocus, audios,
  isLibraryLoading, hasLibraryError, onRetryLibrary,
  disabled = false, isTrackUnavailable = false, onSelectTrack,
  onTogglePlay, onChangeVolume, onToggleAutoPlay,
}: PomodoroAmbientPlayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTrack = currentTrackId === "none" ? AUDIO_OFF_TRACK : audios.find((audio) => audio.id === currentTrackId);
  const activeTrackName = activeTrack?.name ?? (isLibraryLoading ? "Loading audio..." : "Audio track unavailable");
  const activeTrackDescription = activeTrack?.description ?? POMODORO_AUDIO_MESSAGES.unavailable;
  const activeTrackIcon = activeTrack?.icon ?? "FileAudio";

  const isMuted = volume === 0;

  return (
    <fieldset disabled={disabled} aria-label="Focus sounds and music" className="w-full min-w-0 max-w-lg rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-slate-300 hover:shadow-md disabled:opacity-60">
      <div className="flex items-center justify-between gap-3">
        {/* Track Selector Popover Trigger */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-full px-1 py-0.5 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait"
            >
              {/* Animated Sound Artwork / Equalizer */}
              <div
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  isPlaying
                    ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white shadow-xs shadow-blue-500/30 scale-105"
                    : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600",
                )}
              >
                {isPlaying ? (
                  <div className="flex items-end gap-0.5 h-3.5">
                    <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-duration:0.6s]" />
                    <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce [animation-delay:0.15s] [animation-duration:0.6s]" />
                    <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.3s] [animation-duration:0.6s]" />
                  </div>
                ) : (
                  <PomodoroAudioIcon name={activeTrackIcon} />
                )}
              </div>

              {/* Track Title and Description */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                    {activeTrackName}
                  </span>
                  {isPlaying && (
                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-400 group-hover:text-slate-500 transition-colors">
                  {currentTrackId === "none"
                    ? "Choose instrumental music or rain sounds to focus"
                    : isPlaying
                      ? "Playing • Click to change track"
                      : activeTrackDescription}
                </p>
              </div>

              {/* Chevron Down */}
              <ChevronDown className="size-3.5 text-slate-400 shrink-0 transition-transform duration-200 group-hover:text-slate-700 group-hover:translate-y-0.5 ml-0.5" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-96 max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
            align="start"
            sideOffset={8}
          >
            <fieldset disabled={disabled} className="min-w-0">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-blue-50 text-[var(--color-primary,#1C4D8D)] flex items-center justify-center">
                  <Sparkles className="size-3.5" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Focus sounds & music
                </span>
              </div>
              <Sliders className="size-3.5 text-slate-400" />
            </div>

            <PomodoroAudioTrackList
              audios={audios}
              currentTrackId={currentTrackId}
              isLoading={isLibraryLoading}
              hasError={hasLibraryError}
              onRetry={onRetryLibrary}
              onSelectTrack={(trackId) => { onSelectTrack(trackId); setIsOpen(false); }}
            />

            {/* Auto-play Switch Row */}
            <div className="mt-3 border-t border-slate-100 pt-3 px-1 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-800 font-semibold">
                  Auto-play during focus
                </div>
                <div className="text-[10px] text-slate-400">
                  Stop audio when the timer ends or a break starts
                </div>
              </div>
              <Switch
                checked={autoPlayOnFocus}
                onCheckedChange={onToggleAutoPlay}
                aria-label="Auto-play during focus"
                disabled={disabled}
              />
            </div>
            <label className="mt-3 block border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700 sm:hidden">
              Volume: {Math.round(volume * 100)}%
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={(event) => onChangeVolume(Number(event.target.value))}
                className="mt-2 block w-full accent-[var(--color-primary,#1C4D8D)]" />
            </label>
            </fieldset>
          </PopoverContent>
        </Popover>

        {/* Subtle Hairline Divider */}
        {currentTrackId !== "none" && (
          <div className="h-5 w-[1px] bg-slate-200/80 shrink-0" />
        )}

        {/* Integrated Playback & Volume Dock */}
        {currentTrackId !== "none" && (
          <div className="flex items-center gap-2 shrink-0 pr-1">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={disabled || isLibraryLoading || isTrackUnavailable}
              title={isPlaying ? "Pause audio" : "Play audio"}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:hover:scale-100",
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25"
                  : "bg-[var(--color-primary,#1C4D8D)] hover:bg-[var(--color-primary-strong,#0F2854)] shadow-blue-900/20",
              )}
            >
              {isPlaying ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Seamless Volume Control */}
            <div className="hidden sm:flex items-center gap-1 group/vol">
              <button
                type="button"
                onClick={() => onChangeVolume(isMuted ? 0.5 : 0)}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100"
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="size-3.5 text-rose-500" />
                ) : (
                  <Volume2 className="size-3.5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-14 sm:w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary,#1C4D8D)] hover:accent-blue-600 transition-all"
                title={`Volume: ${Math.round(volume * 100)}%`}
                aria-label="Audio volume"
              />
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
});
