import { Coffee, Palmtree, Sparkles, type LucideIcon } from "lucide-react";
import type { PomodoroMode } from "../types/pomodoro";

interface PomodoroModeTheme {
  name: string;
  badgeLabel: string;
  runningHint: string;
  idleHint: string;
  icon: LucideIcon;
  color: string;
  trackColor: string;
  badgeClass: string;
  bannerClass: string;
  tabClass: string;
  startButtonClass: string;
}

export const POMODORO_MODES: readonly PomodoroMode[] = [
  "FOCUS",
  "SHORT_BREAK",
  "LONG_BREAK",
];

export const POMODORO_MODE_THEMES: Record<PomodoroMode, PomodoroModeTheme> = {
  FOCUS: {
    name: "Focus",
    badgeLabel: "Deep Focus Session",
    runningHint: "Stay locked in — distractions muted",
    idleHint: "Ready to start your focus block",
    icon: Sparkles,
    color: "var(--wsh-primary)",
    trackColor: "var(--muted)",
    badgeClass: "bg-wsh-ice-soft text-wsh-heading border-wsh-accent/30",
    bannerClass: "bg-wsh-ice-soft border-wsh-accent/40 text-wsh-heading",
    tabClass:
      "data-[state=active]:bg-wsh-primary data-[state=active]:text-white data-[state=active]:border-transparent focus-visible:ring-ring",
    startButtonClass: "bg-wsh-primary hover:bg-wsh-primary-hover text-white",
  },
  SHORT_BREAK: {
    name: "Short break",
    badgeLabel: "Short Recharge",
    runningHint: "Step back, stretch & rest your eyes",
    idleHint: "Take a quick breather",
    icon: Coffee,
    color: "var(--wsh-break-short)",
    trackColor: "var(--wsh-break-short-track)",
    badgeClass:
      "bg-wsh-break-short-soft text-teal-800 border-teal-200/80 dark:text-teal-300 dark:border-teal-800/60",
    bannerClass:
      "bg-wsh-break-short-soft border-teal-200 text-teal-900 dark:border-teal-800/60 dark:text-teal-200",
    tabClass:
      "data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-transparent focus-visible:ring-ring",
    startButtonClass: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  LONG_BREAK: {
    name: "Long break",
    badgeLabel: "Extended Recovery",
    runningHint: "Disconnect completely & recharge energy",
    idleHint: "You earned a longer recovery break",
    icon: Palmtree,
    color: "var(--wsh-break-long)",
    trackColor: "var(--wsh-break-long-track)",
    badgeClass:
      "bg-wsh-break-long-soft text-emerald-800 border-emerald-200/80 dark:text-emerald-300 dark:border-emerald-800/60",
    bannerClass:
      "bg-wsh-break-long-soft border-emerald-200 text-emerald-900 dark:border-emerald-800/60 dark:text-emerald-200",
    tabClass:
      "data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-transparent focus-visible:ring-ring",
    startButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
};
