"use client";

import React from "react";
import type { PomodoroMode, PomodoroStatus } from "../types/pomodoro";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import { cn } from "@/lib/utils";
import { Sparkles, Coffee, Palmtree, Target, StickyNote } from "lucide-react";

interface PomodoroTimerDisplayProps {
  mode: PomodoroMode;
  status: PomodoroStatus;
  timeLeft: number;
  totalDuration: number;
  focusDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  cycleCount?: number;
  longBreakInterval?: number;
  activeTaskTitle?: string;
  activeTaskNote?: string;
  activeTaskCompletedPomodoros?: number;
  activeTaskEstimatedPomodoros?: number;
  onSwitchMode: (mode: PomodoroMode) => void;
}

export function PomodoroTimerDisplay({
  mode,
  status,
  timeLeft,
  totalDuration,
  focusDuration = 25,
  shortBreakDuration = 5,
  longBreakDuration = 15,
  activeTaskTitle,
  activeTaskNote,
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

  const dialSize = 360;
  const center = dialSize / 2;
  const radius = 150;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  // Knob indicator calculation (starts at 12 o'clock, moves clockwise)
  const knobAngleRad = (progressPercent / 100) * 2 * Math.PI;
  const knobX = center + radius * Math.cos(knobAngleRad);
  const knobY = center + radius * Math.sin(knobAngleRad);

  const isRunning = status === "RUNNING";
  const cleanedTaskNote = cleanTaskDescription(activeTaskNote);

  const statusText = isRunning
    ? safeMode === "FOCUS"
      ? "Đang tập trung"
      : "Đang nghỉ ngơi"
    : status === "PAUSED"
      ? "Đang tạm dừng"
      : "Sẵn sàng bắt đầu";

  const defaultTheme = {
    name: "Tập trung",
    icon: Sparkles,
    color: "#1C4D8D",
    gradient: "from-blue-600 via-indigo-600 to-sky-500",
    glowBg:
      "bg-radial-[at_center] from-blue-500/10 via-indigo-500/5 to-transparent",
    badgeClass:
      "bg-blue-50 text-[var(--color-primary,#1C4D8D)] border-blue-200/80 shadow-xs",
    ringGlow: "drop-shadow(0 0 16px rgba(28, 77, 141, 0.35))",
    activeTab:
      "bg-white text-[var(--color-primary,#1C4D8D)] shadow-sm font-bold",
  };

  const modeThemes =
    {
      FOCUS: defaultTheme,
      SHORT_BREAK: {
        name: "Nghỉ ngắn",
        icon: Coffee,
        color: "#0D9488",
        gradient: "from-teal-500 via-emerald-500 to-cyan-500",
        glowBg:
          "bg-radial-[at_center] from-teal-500/10 via-emerald-500/5 to-transparent",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80 shadow-xs",
        ringGlow: "drop-shadow(0 0 16px rgba(13, 148, 136, 0.35))",
        activeTab: "bg-white text-teal-700 shadow-sm font-bold",
      },
      LONG_BREAK: {
        name: "Nghỉ dài",
        icon: Palmtree,
        color: "#2563EB",
        gradient: "from-sky-500 via-blue-600 to-indigo-500",
        glowBg:
          "bg-radial-[at_center] from-sky-500/10 via-blue-500/5 to-transparent",
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
          <span>Tập trung ({focusDuration}m)</span>
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
          <span>Nghỉ ngắn ({shortBreakDuration}m)</span>
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
          <span>Nghỉ dài ({longBreakDuration}m)</span>
        </button>
      </div>

      {/* Center Dial & Precision Timepiece Ring */}
      <div className="relative my-6 flex items-center justify-center">
        {/* Outer Decorative Track Ring with tick marks */}
        <div className="relative flex size-[360px] shrink-0 aspect-square items-center justify-center rounded-full bg-white shadow-[0_12px_40px_-12px_rgba(15,40,84,0.12)] border border-slate-200/80">
          {/* SVG Progress Circle */}
          <svg
            width={dialSize}
            height={dialSize}
            viewBox={`0 0 ${dialSize} ${dialSize}`}
            className="pointer-events-none absolute inset-0 size-full -rotate-90 transform z-10 overflow-visible"
          >
            <defs>
              <linearGradient
                id="timerGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={modeThemes.color} />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>

            {/* 12 Hour Clock Dial Tick Marks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = center + 163 * Math.cos(angle);
              const y1 = center + 163 * Math.sin(angle);
              const x2 = center + 169 * Math.cos(angle);
              const y2 = center + 169 * Math.sin(angle);
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
              cx={center}
              cy={center}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="8"
              fill="transparent"
              strokeLinecap="round"
              className="opacity-80"
            />

            {/* Active animated stroke */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#timerGradient)"
              strokeWidth="8"
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
              <circle cx={knobX} cy={knobY} r="2.5" fill={modeThemes.color} />
            </g>
          </svg>

          {/* Center Digital Display & Contoured Task Focus Zone */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-10 text-center">
            {/* 1. Top Eyebrow: Compact Mode + Live Status Pill */}
            <div
              title={statusText}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] transition-all",
                modeThemes.badgeClass,
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full transition-all",
                  isRunning
                    ? "animate-pulse bg-emerald-500 ring-2 ring-emerald-200/80"
                    : status === "PAUSED"
                      ? "bg-amber-500 ring-2 ring-amber-200/80"
                      : "bg-slate-400/70",
                )}
              />
              <ModeIcon className="size-3" />
              <span>{modeThemes.name}</span>
            </div>

            {/* 2. Center Hero: Unified Timepiece Digits */}
            <div
              aria-label={formattedTime}
              className="my-3.5 text-[54px] leading-none font-black tracking-[-0.04em] text-slate-900 tabular-nums"
            >
              {formattedTime}
            </div>

            {/* 3. Lower Hemisphere: Frameless Active Task OR Idle Status */}
            {activeTaskTitle ? (
              <div
                role="status"
                aria-live="polite"
                className="relative flex w-full max-w-[196px] flex-col items-center"
              >
                {/* Hero Task Title with Accent Target Icon */}
                <div className="flex max-w-full items-center justify-center gap-1.5">
                  <Target
                    className="size-3.5 shrink-0"
                    style={{ color: modeThemes.color }}
                  />
                  <strong
                    className="truncate text-[15px] font-extrabold tracking-tight leading-snug text-slate-900"
                    title={activeTaskTitle}
                  >
                    {activeTaskTitle}
                  </strong>
                </div>

                {/* Quiet Frameless Note Subtitle + Frosted Popover when truncated */}
                {cleanedTaskNote &&
                  (() => {
                    const isNoteTruncated =
                      cleanedTaskNote.includes("\n") ||
                      cleanedTaskNote.length > 24;
                    return (
                      <div
                        tabIndex={isNoteTruncated ? 0 : undefined}
                        className="group/note-pill relative mt-1 flex max-w-full items-center justify-center gap-1 text-[11.5px] text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none"
                      >
                        <StickyNote
                          className="size-3 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                        <span className="max-w-[164px] truncate leading-tight">
                          {cleanedTaskNote}
                        </span>

                        {isNoteTruncated && (
                          <div
                            role="tooltip"
                            className="pointer-events-none invisible absolute top-full left-1/2 z-30 mt-2 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-left text-xs leading-relaxed text-slate-700 opacity-0 shadow-[0_12px_30px_-6px_rgba(15,40,84,0.14),0_2px_6px_-1px_rgba(15,40,84,0.06)] backdrop-blur-xl transition-all duration-150 ease-out group-hover/note-pill:visible group-hover/note-pill:translate-y-0 group-hover/note-pill:opacity-100 group-focus-visible/note-pill:visible group-focus-visible/note-pill:translate-y-0 group-focus-visible/note-pill:opacity-100"
                          >
                            <div className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-l border-t border-slate-200/90 bg-white" />
                            <p className="whitespace-pre-wrap break-words">
                              {cleanedTaskNote}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3 py-1 text-[11px] font-medium text-slate-500 border border-slate-200/50">
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-all",
                    isRunning
                      ? "animate-ping bg-emerald-500"
                      : status === "PAUSED"
                        ? "bg-amber-500"
                        : "bg-slate-300",
                  )}
                />
                <span>{statusText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
