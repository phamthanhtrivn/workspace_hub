export type GanttZoomMode = "day" | "week" | "month";

export interface GanttRange {
  start: Date;
  end: Date;
}

export interface GanttScale {
  range: GanttRange;
  zoomMode: GanttZoomMode;
  dayWidth: number;
  monthWidth: number;
}

export interface GanttBarGeometry {
  placement: "before" | "inside" | "after";
  left: number;
  width: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}
