"use client";

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PomodoroControlsProps {
  status: PomodoroStatus;
  mode: PomodoroMode;
  isMuted: boolean;
  isFullscreen: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  onOpenInterruption: () => void;
}

export function PomodoroControls({
  status,
  mode,
  isMuted,
  isFullscreen,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onToggleSound,
  onToggleFullscreen,
  onOpenSettings,
  onOpenInterruption,
}: PomodoroControlsProps) {
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isFocus = mode === "FOCUS";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Primary Action Dock */}
      <div className="flex items-center gap-3 p-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-lg shadow-slate-200/40 backdrop-blur-md">
        {/* Reset Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          title="Đặt lại phiên (Reset)"
          className="size-11 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-transform active:scale-90"
        >
          <RotateCcw className="size-4.5" />
        </Button>

        {/* Hero Play / Pause / Resume Button */}
        {status === "IDLE" ? (
          <Button
            type="button"
            onClick={onStart}
            className={cn(
              "h-13 px-8 rounded-full text-sm font-black tracking-wider uppercase shadow-md transition-all duration-200 active:scale-95",
              isFocus
                ? "bg-gradient-to-r from-[var(--color-primary,#1C4D8D)] to-[var(--color-primary-strong,#0F2854)] text-white shadow-blue-900/25 hover:shadow-blue-900/35 hover:brightness-110"
                : "bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-teal-900/25 hover:brightness-110",
            )}
          >
            <Play className="mr-2 size-4.5 fill-current" />
            BẮT ĐẦU FOCUS
          </Button>
        ) : isRunning ? (
          <Button
            type="button"
            onClick={onPause}
            className="h-13 px-8 rounded-full text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-900/20 hover:brightness-110 transition-all duration-200 active:scale-95"
          >
            <Pause className="mr-2 size-4.5 fill-current" />
            TẠM DỪNG
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onResume}
            className={cn(
              "h-13 px-8 rounded-full text-sm font-black tracking-wider uppercase shadow-md transition-all duration-200 active:scale-95",
              isFocus
                ? "bg-gradient-to-r from-[var(--color-primary,#1C4D8D)] to-[var(--color-primary-strong,#0F2854)] text-white shadow-blue-900/25 hover:brightness-110"
                : "bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-teal-900/25 hover:brightness-110",
            )}
          >
            <Play className="mr-2 size-4.5 fill-current" />
            TIẾP TỤC
          </Button>
        )}

        {/* Skip Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSkip}
          title="Bỏ qua phiên này (Skip)"
          className="size-11 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-transform active:scale-90"
        >
          <SkipForward className="size-4.5" />
        </Button>
      </div>

      {/* Auxiliary Floating Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 shadow-2xs backdrop-blur-sm text-slate-600">
        {/* Interruption Button */}
        {status !== "IDLE" && (
          <button
            type="button"
            onClick={onOpenInterruption}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-amber-700 hover:bg-amber-100/80 transition-colors"
          >
            <AlertCircle className="size-3.5" />
            <span>Ghi gián đoạn</span>
          </button>
        )}

        {/* Sound Alert Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          title={isMuted ? "Bật chuông thông báo" : "Tắt chuông thông báo"}
          className="p-1.5 hover:bg-white hover:text-slate-900 rounded-full transition-all"
        >
          {isMuted ? (
            <VolumeX className="size-4 text-slate-400" />
          ) : (
            <Volume2 className="size-4 text-slate-700" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình tập trung"}
          className="p-1.5 hover:bg-white hover:text-slate-900 rounded-full transition-all"
        >
          {isFullscreen ? (
            <Minimize2 className="size-4 text-slate-700" />
          ) : (
            <Maximize2 className="size-4 text-slate-700" />
          )}
        </button>

        {/* Settings Dialog Trigger */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Cài đặt Pomodoro"
          className="p-1.5 hover:bg-white hover:text-slate-900 rounded-full transition-all"
        >
          <Settings className="size-4 text-slate-700" />
        </button>
      </div>
    </div>
  );
}
