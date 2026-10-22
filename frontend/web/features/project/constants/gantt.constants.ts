import type { GanttZoomMode } from "../types/gantt";

export const GANTT_ZOOM_CONFIG: Record<GanttZoomMode, {
  dayWidth: number; spanDays: number; shiftDays: number; weekWidth: number; monthWidth: number;
}> = {
  day: { dayWidth: 100, spanDays: 14, shiftDays: 7, weekWidth: 700, monthWidth: 700 },
  week: { dayWidth: 32, spanDays: 28, shiftDays: 7, weekWidth: 224, monthWidth: 896 },
  month: { dayWidth: 3.15, spanDays: 365, shiftDays: 365, weekWidth: 22, monthWidth: 96 },
};

export const GANTT_LABEL_WIDTH = 280;
export const GANTT_MIN_LABEL_WIDTH = 160;
export const GANTT_LABEL_WIDTH_RATIO = 0.35;
export const GANTT_INITIAL_HORIZON_DAYS = 30;
export const GANTT_BAR_LABEL_MIN_WIDTH = 90;
export const GANTT_HIT_WIDTH = { pointer: 24, touch: 44 } as const;

export const GANTT_LAYER_CLASSES = {
  timeline: "isolate",
  today: "z-10",
  label: "z-20",
  header: "z-30",
  corner: "z-40",
} as const;
