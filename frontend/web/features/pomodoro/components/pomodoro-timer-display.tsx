"use client";

import React from "react";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";
import { cn } from "@/lib/utils";
import { Sparkles, Coffee, Palmtree } from "lucide-react";

interface PomodoroTimerDisplayProps {
  mode: PomodoroMode;
  status: PomodoroStatus;
  timeLeft: number;
  totalDuration: number;
  cycleCount: number;
  longBreakInterval: number;
  onSwitchMode: (mode: PomodoroMode) => void;
}

export function PomodoroTimerDisplay({
  mode,
  status,
  timeLeft,
  totalDuration,
  cycleCount,
  longBreakInterval,
  onSwitchMode,
}: PomodoroTimerDisplayProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  // Visual Tokens & Themes by Mode
  const safeMode: PomodoroMode =
    mode && ["FOCUS", "SHORT_BREAK", "LONG_BREAK"].includes(mode)
      ? mode
      : "FOCUS";

  const effectiveTotal =
    totalDuration > 0
      ? totalDuration
      : safeMode === "FOCUS"
        ? 25 * 60
        : safeMode === "SHORT_BREAK"
          ? 5 * 60
          : 15 * 60;

  const progressPercent = Math.max(
    0,
    Math.min(100, ((effectiveTotal - timeLeft) / effectiveTotal) * 100),
  );

  const radius = 142;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Knob indicator calculation (starts at 12 o'clock, moves clockwise)
  const knobAngleRad = (progressPercent / 100) * 2 * Math.PI;
  const knobX = 170 + radius * Math.cos(knobAngleRad);
  const knobY = 170 + radius * Math.sin(knobAngleRad);

  const isRunning = status === "RUNNING";

  const defaultTheme = {
    name: "Tập trung",
    icon: Sparkles,
    color: "#1C4D8D",
    gradient: "from-blue-600 via-indigo-600 to-sky-500",
    glowBg: "bg-radial-[at_center] from-blue-500/10 via-indigo-500/5 to-transparent",
    badgeClass: "bg-blue-50 text-[var(--color-primary,#1C4D8D)] border-blue-200/80 shadow-xs",
    ringGlow: "drop-shadow(0 0 16px rgba(28, 77, 141, 0.35))",
    activeTab: "bg-white text-[var(--color-primary,#1C4D8D)] shadow-sm font-bold",
  };

  const modeThemes = {
    FOCUS: defaultTheme,
    SHORT_BREAK: {
      name: "Nghỉ ngắn",
      icon: Coffee,
      color: "#0D9488",
      gradient: "from-teal-500 via-emerald-500 to-cyan-500",
      glowBg: "bg-radial-[at_center] from-teal-500/10 via-emerald-500/5 to-transparent",
      badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80 shadow-xs",
      ringGlow: "drop-shadow(0 0 16px rgba(13, 148, 136, 0.35))",
      activeTab: "bg-white text-teal-700 shadow-sm font-bold",
    },
    LONG_BREAK: {
      name: "Nghỉ dài",
      icon: Palmtree,
      color: "#2563EB",
      gradient: "from-sky-500 via-blue-600 to-indigo-500",
      glowBg: "bg-radial-[at_center] from-sky-500/10 via-blue-500/5 to-transparent",
      badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80 shadow-xs",
      ringGlow: "drop-shadow(0 0 16px rgba(37, 99, 235, 0.35))",
      activeTab: "bg-white text-blue-700 shadow-sm font-bold",
    },
  }[safeMode] || defaultTheme;

  const ModeIcon = modeThemes?.icon || Sparkles;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Ambient background aura */}
      <div
        className={cn(
          "absolute -inset-10 -z-10 rounded-full blur-3xl transition-opacity duration-1000 pointer-events-none",
          modeThemes.glowBg,
          isRunning ? "opacity-100 scale-105" : "opacity-40",
        )}
      />

      {/* Segmented Mode Selector */}
      <div className="flex items-center gap-1 rounded-2xl bg-slate-100/90 p-1.5 border border-slate-200/70 shadow-inner backdrop-blur-sm">
        <button
          type="button"
          onClick={() => onSwitchMode("FOCUS")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium tracking-tight transition-all duration-200",
            mode === "FOCUS"
              ? modeThemes.activeTab
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
          )}
        >
          <Sparkles className="size-3.5" />
          <span>Tập trung (25m)</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode("SHORT_BREAK")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium tracking-tight transition-all duration-200",
            mode === "SHORT_BREAK"
              ? modeThemes.activeTab
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
          )}
        >
          <Coffee className="size-3.5" />
          <span>Nghỉ ngắn (5m)</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode("LONG_BREAK")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium tracking-tight transition-all duration-200",
            mode === "LONG_BREAK"
              ? modeThemes.activeTab
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60",
          )}
        >
          <Palmtree className="size-3.5" />
          <span>Nghỉ dài (15m)</span>
        </button>
      </div>

      {/* Center Dial & Precision Timepiece Ring */}
      <div className="relative my-7 flex items-center justify-center">
        {/* Outer Decorative Track Ring with tick marks */}
        <div className="relative flex size-[340px] items-center justify-center rounded-full bg-white/80 p-3 shadow-xl shadow-slate-200/50 border border-slate-100 backdrop-blur-md">
          {/* Subtle Inner Bezel */}
          <div className="absolute inset-4 rounded-full border border-slate-100 shadow-inner bg-gradient-to-b from-slate-50/50 via-white to-slate-50/80" />

          {/* SVG Progress Circle */}
          <svg className="size-[340px] -rotate-90 transform z-10 overflow-visible">
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={modeThemes.color} />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>

            {/* 12 Hour Clock Dial Tick Marks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 170 + 155 * Math.cos(angle);
              const y1 = 170 + 155 * Math.sin(angle);
              const x2 = 170 + 160 * Math.cos(angle);
              const y2 = 170 + 160 * Math.sin(angle);
              const isQuarter = i % 3 === 0;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isQuarter ? "#64748B" : "#CBD5E1"}
                  strokeWidth={isQuarter ? "2" : "1.2"}
                  strokeLinecap="round"
                  className={isQuarter ? "opacity-75" : "opacity-45"}
                />
              );
            })}

            {/* Inactive track */}
            <circle
              cx="170"
              cy="170"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="9"
              fill="transparent"
              strokeLinecap="round"
              className="opacity-70"
            />

            {/* Active animated stroke */}
            <circle
              cx="170"
              cy="170"
              r={radius}
              stroke="url(#timerGradient)"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ filter: isRunning ? modeThemes.ringGlow : undefined }}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />

            {/* Glowing Time Knob / Pointer Indicator (Nút mốc thời gian đang chạy) */}
            <g
              className="transition-all duration-700 ease-out pointer-events-none"
              style={{ filter: "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.28))" }}
            >
              {/* Pulsing ring when active */}
              {isRunning && (
                <circle
                  cx={knobX}
                  cy={knobY}
                  r="13"
                  fill={modeThemes.color}
                  className="animate-ping opacity-25"
                />
              )}

              {/* Glowing halo */}
              <circle
                cx={knobX}
                cy={knobY}
                r="10"
                fill={modeThemes.color}
                className={cn(
                  "transition-opacity duration-300",
                  isRunning ? "opacity-40" : "opacity-25",
                )}
              />

              {/* White outer disc with colored border */}
              <circle
                cx={knobX}
                cy={knobY}
                r="7.5"
                fill="#FFFFFF"
                stroke={modeThemes.color}
                strokeWidth="3.5"
              />

              {/* Center colored pip */}
              <circle
                cx={knobX}
                cy={knobY}
                r="2.5"
                fill={modeThemes.color}
              />
            </g>
          </svg>

          {/* Center Digital Display */}
          <div className="absolute z-20 flex flex-col items-center justify-center text-center">
            {/* Mode Pill Badge */}
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all",
                modeThemes.badgeClass,
              )}
            >
              <ModeIcon className="size-3" />
              <span>{modeThemes.name}</span>
            </div>

            {/* Digits Display */}
            <div className="my-1.5 font-mono text-7xl font-black tracking-tighter text-slate-900 tabular-nums">
              {formattedTime}
            </div>

            {/* Visual Progress Bar & Percentage Indicator */}
            <div className="w-38 mb-2 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shadow-2xs">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    safeMode === "FOCUS"
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500"
                      : safeMode === "SHORT_BREAK"
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                        : "bg-gradient-to-r from-sky-500 to-blue-600",
                  )}
                  style={{ width: `${Math.max(2, progressPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 tabular-nums px-0.5">
                <span>{Math.round(progressPercent)}%</span>
                <span>
                  {isRunning
                    ? `Còn ${Math.ceil(timeLeft / 60)} phút`
                    : status === "PAUSED"
                      ? "Đang tạm dừng"
                      : `Tổng ${Math.round(effectiveTotal / 60)} phút`}
                </span>
              </div>
            </div>

            {/* Live Status indicator */}
            <div className="flex items-center gap-2 rounded-full bg-slate-100/90 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200/50 shadow-2xs">
              <span
                className={cn(
                  "size-2 rounded-full transition-all",
                  isRunning
                    ? "animate-ping bg-emerald-500"
                    : status === "PAUSED"
                      ? "bg-amber-500 ring-2 ring-amber-100"
                      : "bg-slate-300",
                )}
              />
              <span className="text-[11px]">
                {isRunning
                  ? "Đang tập trung"
                  : status === "PAUSED"
                    ? "Đang tạm dừng"
                    : "Sẵn sàng bắt đầu"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cycle Indicator Badge & Pips */}
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 border border-slate-200/80 shadow-xs">
        <span className="text-xs font-medium text-slate-500">Chu kỳ Pomodoro:</span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: longBreakInterval }).map((_, idx) => {
            const isFilled = idx < cycleCount;
            return (
              <div
                key={idx}
                title={`Phiên ${idx + 1}/${longBreakInterval}`}
                className={cn(
                  "size-3 rounded-full transition-all duration-300",
                  isFilled
                    ? "bg-[var(--color-primary,#1C4D8D)] shadow-xs scale-110 ring-2 ring-blue-100"
                    : "bg-slate-200 border border-slate-300/40",
                )}
              />
            );
          })}
        </div>
        <span className="text-xs font-bold text-slate-700 ml-1">
          {cycleCount} / {longBreakInterval}
        </span>
      </div>
    </div>
  );
}
