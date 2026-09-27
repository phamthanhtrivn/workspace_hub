"use client";

import React, { useRef, useState } from "react";
import {
  Headphones,
  Music,
  Radio,
  CloudRain,
  Coffee,
  Waves,
  Wind,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronDown,
  Upload,
  FileAudio,
  Trash2,
  Loader2,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  AMBIENT_TRACKS,
  type AmbientTrack,
  type AmbientTrackId,
} from "../types/ambient";
import type { CustomTrackRecord } from "../utils/audio-storage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PomodoroAmbientPlayerProps {
  currentTrackId: AmbientTrackId;
  isPlaying: boolean;
  volume: number;
  autoPlayOnFocus: boolean;
  customTracks: CustomTrackRecord[];
  onSelectTrack: (trackId: AmbientTrackId, url?: string) => void;
  onTogglePlay: () => void;
  onChangeVolume: (volume: number) => void;
  onToggleAutoPlay: (enabled: boolean) => void;
  onUploadTrack: (file: File) => Promise<CustomTrackRecord>;
  onRemoveCustomTrack: (id: string) => Promise<void>;
}

export function PomodoroAmbientPlayer({
  currentTrackId,
  isPlaying,
  volume,
  autoPlayOnFocus,
  customTracks,
  onSelectTrack,
  onTogglePlay,
  onChangeVolume,
  onToggleAutoPlay,
  onUploadTrack,
  onRemoveCustomTrack,
}: PomodoroAmbientPlayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  let activeTrackName = "Tắt âm thanh nền";
  let activeTrackDescription = "Chọn nhạc không lời / tiếng mưa để tập trung";
  let activeTrackIcon = "VolumeX";

  const foundPredefined = AMBIENT_TRACKS.find((t) => t.id === currentTrackId);
  if (foundPredefined) {
    activeTrackName = foundPredefined.name;
    activeTrackDescription = foundPredefined.description;
    activeTrackIcon = foundPredefined.icon;
  } else if (currentTrackId.startsWith("custom_")) {
    const foundCustom = customTracks.find((t) => t.id === currentTrackId);
    if (foundCustom) {
      activeTrackName = foundCustom.name;
      activeTrackDescription = `Tệp âm thanh cá nhân (${(foundCustom.size / (1024 * 1024)).toFixed(1)} MB)`;
      activeTrackIcon = "FileAudio";
    }
  }

  const getTrackIcon = (iconName: string) => {
    switch (iconName) {
      case "Headphones":
        return <Headphones className="size-4" />;
      case "Music":
        return <Music className="size-4" />;
      case "Radio":
        return <Radio className="size-4" />;
      case "CloudRain":
        return <CloudRain className="size-4" />;
      case "Coffee":
        return <Coffee className="size-4" />;
      case "Waves":
        return <Waves className="size-4" />;
      case "Wind":
        return <Wind className="size-4" />;
      case "FileAudio":
        return <FileAudio className="size-4" />;
      default:
        return <VolumeX className="size-4" />;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await onUploadTrack(file);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to upload audio file:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isMuted = volume === 0;

  return (
    <div className="w-full max-w-lg rounded-full border border-slate-200/90 bg-white/95 py-1.5 px-3 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        {/* Track Selector Popover Trigger */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left rounded-full py-0.5 px-1 hover:bg-slate-50/80 transition-colors group cursor-pointer focus:outline-none"
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
                  getTrackIcon(activeTrackIcon)
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
                    ? "Chọn nhạc không lời / tiếng mưa để tập trung"
                    : isPlaying
                      ? "Đang phát • Bấm để đổi bài"
                      : activeTrackDescription}
                </p>
              </div>

              {/* Chevron Down */}
              <ChevronDown className="size-3.5 text-slate-400 shrink-0 transition-transform duration-200 group-hover:text-slate-700 group-hover:translate-y-0.5 ml-0.5" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-96 p-4 rounded-3xl shadow-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
            align="start"
            sideOffset={8}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-blue-50 text-[var(--color-primary,#1C4D8D)] flex items-center justify-center">
                  <Sparkles className="size-3.5" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  Âm thanh & Giai điệu tập trung
                </span>
              </div>
              <Sliders className="size-3.5 text-slate-400" />
            </div>

            {/* Upload Custom Audio File */}
            <div className="my-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 py-2.5 px-3 text-xs font-semibold text-[var(--color-primary,#1C4D8D)] hover:bg-blue-100/70 transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-blue-600" />
                    <span>Đang nạp file âm thanh vào trình duyệt...</span>
                  </>
                ) : (
                  <>
                    <Upload className="size-3.5" />
                    <span>Tải nhạc từ máy tính (MP3, WAV, M4A)</span>
                  </>
                )}
              </button>
            </div>

            {/* Custom Tracks (if any) */}
            {customTracks.length > 0 && (
              <div className="mb-3 border-b border-slate-100 pb-2.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nhạc của bạn ({customTracks.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {customTracks.map((custom) => {
                    const isSelected = custom.id === currentTrackId;
                    return (
                      <div
                        key={custom.id}
                        className={cn(
                          "group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors",
                          isSelected
                            ? "bg-blue-50 text-[var(--color-primary,#1C4D8D)] font-semibold"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTrack(custom.id, custom.url);
                            setIsOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <FileAudio className="size-4 shrink-0 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {custom.name}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">
                              {(custom.size / (1024 * 1024)).toFixed(1)} MB
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          title="Xóa tệp này"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCustomTrack(custom.id);
                          }}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Predefined Ambient Tracks List */}
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giai điệu tích hợp sẵn
              </div>
              {AMBIENT_TRACKS.map((track) => {
                const isSelected = track.id === currentTrackId;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      onSelectTrack(track.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-all",
                      isSelected
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50/60 text-[var(--color-primary,#1C4D8D)] font-semibold shadow-2xs"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        isSelected
                          ? "bg-blue-100 text-blue-700 font-bold"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {getTrackIcon(track.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{track.name}</div>
                      <div className="truncate text-[10px] text-slate-400">
                        {track.description}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="size-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Auto-play Switch Row */}
            <div className="mt-3 border-t border-slate-100 pt-3 px-1 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-800 font-semibold">
                  Tự động phát khi Focus
                </div>
                <div className="text-[10px] text-slate-400">
                  Dừng nhạc khi hết giờ hoặc vào giờ nghỉ
                </div>
              </div>
              <Switch
                checked={autoPlayOnFocus}
                onCheckedChange={onToggleAutoPlay}
              />
            </div>
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
              title={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc"}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-xs transition-all duration-200 hover:scale-105 active:scale-95",
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
                title={isMuted ? "Bật âm lượng" : "Tắt tiếng"}
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
                title={`Âm lượng: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
