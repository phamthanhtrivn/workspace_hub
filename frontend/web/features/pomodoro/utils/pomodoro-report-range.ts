import {
  presetReportRange, reportRangeErrors, sameReportRange,
  type PomodoroReportPreset, type PomodoroReportRange,
} from "./pomodoro-report";
import { POMODORO_REPORT_DEFAULTS, POMODORO_REPORT_PRESETS } from "../constants/pomodoro-report";

export interface PomodoroReportRangeState {
  today: string;
  preset: PomodoroReportPreset | "custom";
  applied: PomodoroReportRange;
  draft: PomodoroReportRange;
}

type RangeAction =
  | { type: "reset"; today: string }
  | { type: "day"; today: string }
  | { type: "preset"; preset: PomodoroReportPreset; today: string }
  | { type: "draft"; range: PomodoroReportRange }
  | { type: "apply"; today: string }
  | { type: "cancel" };

export function initialReportRange(today: string): PomodoroReportRangeState {
  const range = presetReportRange(POMODORO_REPORT_DEFAULTS.preset, new Date(`${today}T00:00:00`));
  return { today, preset: POMODORO_REPORT_DEFAULTS.preset, applied: range, draft: range };
}

export function reportRangeReducer(state: PomodoroReportRangeState, action: RangeAction): PomodoroReportRangeState {
  switch (action.type) {
    case "reset": return initialReportRange(action.today);
    case "day": {
      if (action.today === state.today) return state;
      const applied = state.preset === "custom" ? state.applied
        : presetReportRange(state.preset, new Date(`${action.today}T00:00:00`));
      return { ...state, today: action.today, applied,
        draft: sameReportRange(state.draft, state.applied) ? applied : state.draft };
    }
    case "preset": {
      const range = presetReportRange(action.preset, new Date(`${action.today}T00:00:00`));
      return { today: action.today, preset: action.preset, applied: range, draft: range };
    }
    case "draft": return { ...state, draft: action.range.startDate ? action.range : { ...action.range, endDate: "" } };
    case "apply": {
      if (Object.keys(reportRangeErrors(state.draft, new Date(`${action.today}T00:00:00`))).length) return state;
      const now = new Date(`${action.today}T00:00:00`);
      const preset = POMODORO_REPORT_PRESETS.find(({ value }) => sameReportRange(state.draft, presetReportRange(value, now)))?.value ?? "custom";
      return { ...state, today: action.today, preset, applied: state.draft };
    }
    case "cancel": return { ...state, draft: state.applied };
  }
}
