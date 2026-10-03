import { Coffee, Palmtree, Sparkles, type LucideIcon } from "lucide-react";
import type { PomodoroMode } from "../types/pomodoro";

interface PomodoroModeTheme {
  name: string;
  icon: LucideIcon;
  color: string;
  gradientEnd: string;
  glowBg: string;
  pageGlowClass: string;
  badgeClass: string;
  ringGlow: string;
  tabClass: string;
  startButtonClass: string;
}

export const POMODORO_MODES: readonly PomodoroMode[] = ["FOCUS", "SHORT_BREAK", "LONG_BREAK"];

export const POMODORO_MODE_THEMES: Record<PomodoroMode, PomodoroModeTheme> = {
  FOCUS: {
    name: "Focus",
    icon: Sparkles,
    color: "#1C4D8D",
    gradientEnd: "#38BDF8",
    glowBg: "bg-radial-[at_center] from-blue-500/10 via-indigo-500/5 to-transparent",
    pageGlowClass: "bg-blue-600/10",
    badgeClass: "bg-blue-50 text-[var(--color-primary,#1C4D8D)] border-blue-200/80 shadow-xs",
    ringGlow: "drop-shadow(0 0 16px rgba(28, 77, 141, 0.35))",
    tabClass: "data-[state=active]:text-[var(--color-primary,#1C4D8D)] focus-visible:ring-[var(--color-primary,#1C4D8D)]/30",
    startButtonClass: "bg-gradient-to-r from-[var(--color-primary,#1C4D8D)] to-[var(--color-primary-strong,#0F2854)] text-white shadow-blue-900/25 hover:brightness-110",
  },
  SHORT_BREAK: {
    name: "Short break",
    icon: Coffee,
    color: "#2563EB",
    gradientEnd: "#38BDF8",
    glowBg: "bg-radial-[at_center] from-blue-500/10 via-sky-500/5 to-transparent",
    pageGlowClass: "bg-blue-500/10",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80 shadow-xs",
    ringGlow: "drop-shadow(0 0 16px rgba(37, 99, 235, 0.35))",
    tabClass: "data-[state=active]:text-blue-600 focus-visible:ring-blue-500/30",
    startButtonClass: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-900/25 hover:brightness-110",
  },
  LONG_BREAK: {
    name: "Long break",
    icon: Palmtree,
    color: "#16A34A",
    gradientEnd: "#4ADE80",
    glowBg: "bg-radial-[at_center] from-green-500/10 via-green-400/5 to-transparent",
    pageGlowClass: "bg-green-500/10",
    badgeClass: "bg-green-50 text-green-700 border-green-200/80 shadow-xs",
    ringGlow: "drop-shadow(0 0 16px rgba(22, 163, 74, 0.35))",
    tabClass: "data-[state=active]:text-green-600 focus-visible:ring-green-500/30",
    startButtonClass: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-green-900/25 hover:brightness-110",
  },
};
