import { Coffee, Palmtree, Sparkles, type LucideIcon } from "lucide-react";
import type { PomodoroMode } from "../types/pomodoro";

interface PomodoroModeTheme {
  name: string;
  icon: LucideIcon;
  color: string;
  badgeClass: string;
  tabClass: string;
  startButtonClass: string;
}

export const POMODORO_MODES: readonly PomodoroMode[] = ["FOCUS", "SHORT_BREAK", "LONG_BREAK"];

export const POMODORO_MODE_THEMES: Record<PomodoroMode, PomodoroModeTheme> = {
  FOCUS: {
    name: "Focus",
    icon: Sparkles,
    color: "var(--primary)",
    badgeClass: "bg-info-soft text-primary-soft-foreground border-border",
    tabClass: "data-[state=active]:text-primary focus-visible:ring-ring",
    startButtonClass: "bg-primary text-primary-foreground",
  },
  SHORT_BREAK: {
    name: "Short break",
    icon: Coffee,
    color: "var(--primary)",
    badgeClass: "bg-info-soft text-info border-border",
    tabClass: "data-[state=active]:text-info focus-visible:ring-ring",
    startButtonClass: "bg-primary text-primary-foreground",
  },
  LONG_BREAK: {
    name: "Long break",
    icon: Palmtree,
    color: "var(--success)",
    badgeClass: "bg-success-soft text-success border-border",
    tabClass: "data-[state=active]:text-success focus-visible:ring-ring",
    startButtonClass: "bg-success text-success-foreground",
  },
};
