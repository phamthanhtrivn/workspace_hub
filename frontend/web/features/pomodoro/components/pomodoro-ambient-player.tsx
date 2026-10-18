"use client";

import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Volume2, VolumeX, Play, Pause, ChevronDown, Sliders } from "lucide-react";
import { AUDIO_OFF_TRACK, type AmbientTrackId, type PomodoroAudio } from "../types/ambient";
import { POMODORO_AUDIO_MESSAGES } from "../constants/pomodoro-audio";
import { PomodoroAudioIcon } from "./pomodoro-audio-icon";
import { PomodoroAudioTrackList } from "./pomodoro-audio-track-list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
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
  const volumeSliderProps: React.ComponentProps<typeof Slider> = {
    className: "cursor-pointer data-[disabled]:cursor-not-allowed [&:not([data-disabled])_*]:cursor-pointer",
    value: [volume],
    min: 0,
    max: 1,
    step: 0.05,
    disabled,
    onValueChange: (values) => onChangeVolume(typeof values === "number" ? values : values[0]),
    thumbProps: {
      "aria-label": "Audio volume",
      getAriaValueText: (_, currentValue) => `${Math.round(currentValue * 100)}%`,
    },
  };

  return (
    <fieldset disabled={disabled} aria-label="Focus sounds and music" className="w-full min-w-0 max-w-lg rounded-control border border-border bg-card px-3 py-1.5 transition-all duration-200 hover:border-input disabled:opacity-60">
      <div className="flex items-center justify-between gap-3">
        {/* Track Selector Popover Trigger */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost"
              type="button"
              className="h-auto justify-start whitespace-normal group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-control px-1 py-0.5 text-left transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
            >
              {/* Track playback state */}
              <div
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-control transition-all duration-200",
                  isPlaying
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-info-soft group-hover:text-info",
                )}
              >
                {isPlaying ? (
                  <Volume2 className="size-4" aria-label="Playing" />
                ) : (
                  <PomodoroAudioIcon name={activeTrackIcon} />
                )}
              </div>

              {/* Track Title and Description */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-foreground group-hover:text-info transition-colors">
                    {activeTrackName}
                  </span>
                  {isPlaying && (
                    <span className="size-1.5 rounded-control bg-success shrink-0" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors">
                  {currentTrackId === "none"
                    ? "Choose instrumental music or rain sounds to focus"
                    : isPlaying
                      ? "Playing • Click to change track"
                      : activeTrackDescription}
                </p>
              </div>

              {/* Chevron Down */}
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0 transition-transform duration-200 group-hover:text-foreground ml-0.5" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-96 max-w-[min(24rem,calc(100vw-2rem))] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-panel border border-border bg-card p-4 shadow-panel"
            align="start"
            sideOffset={8}
          >
            <fieldset disabled={disabled} className="min-w-0">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">

                <span className="text-xs font-semibold text-foreground tracking-tight">
                  Focus sounds & music
                </span>
              </div>
              <Sliders className="size-3.5 text-muted-foreground" />
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
            <div className="mt-3 border-t border-border pt-3 px-1 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-foreground font-semibold">
                  Auto-play during focus
                </div>
                <div className="text-xs text-muted-foreground">
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
            <div className="mt-3 border-t border-border pt-3 text-xs font-semibold text-foreground sm:hidden">
              <span>Volume: {Math.round(volume * 100)}%</span>
              <Slider {...volumeSliderProps} className={cn(volumeSliderProps.className, "mt-2")} />
            </div>
            </fieldset>
          </PopoverContent>
        </Popover>

        {/* Subtle Hairline Divider */}
        {currentTrackId !== "none" && (
          <div className="h-5 w-[1px] bg-accent/80 shrink-0" />
        )}

        {/* Integrated Playback & Volume Dock */}
        {currentTrackId !== "none" && (
          <div className="flex items-center gap-2 shrink-0 pr-1">
            {/* Play/Pause Button */}
            <Button variant="ghost"
              type="button"
              size="icon-sm"
              onClick={onTogglePlay}
              disabled={disabled || isLibraryLoading || isTrackUnavailable}
              title={isPlaying ? "Pause audio" : "Play audio"}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              className={cn(
                "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control text-primary-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
                isPlaying
                  ? "bg-warning text-warning-foreground hover:bg-warning"
                  : "bg-primary hover:bg-primary-hover",
              )}
            >
              {isPlaying ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current ml-0.5" />
              )}
            </Button>

            {/* Seamless Volume Control */}
            <div className="hidden sm:flex items-center gap-1 group/vol">
              <Button variant="ghost"
                type="button"
                onClick={() => onChangeVolume(isMuted ? 0.5 : 0)}
                size="icon-sm"
                className="cursor-pointer p-1 text-muted-foreground hover:text-foreground transition-colors rounded-control hover:bg-muted disabled:cursor-not-allowed"
                title={isMuted ? "Unmute" : "Mute"}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="size-3.5 text-destructive" />
                ) : (
                  <Volume2 className="size-3.5" />
                )}
              </Button>
              <Slider
                {...volumeSliderProps}
                className={cn(volumeSliderProps.className, "w-16 [&>div]:min-h-8 [&_[data-slot=slider-track]]:h-1")}
                thumbProps={{ ...volumeSliderProps.thumbProps, className: "size-3.5" }}
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
});
