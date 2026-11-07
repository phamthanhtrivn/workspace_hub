import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import type { Project, Task } from "@/features/project/types/project";

export type FocusPickerSource = "calendar" | "project";
export type FocusPickerTask =
  | { source: "calendar"; id: string; event: CalendarEvent }
  | { source: "project"; id: string; task: Task; project: Project };

export interface FocusPickerDateRange {
  startDate: string;
  endDate: string;
}

export type FocusPickerDateErrors = Partial<Record<keyof FocusPickerDateRange, string>>;
